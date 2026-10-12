// checkPermissionMiddleware.js
const User = require('../model/User');
const Role = require('../model/Role');
const Warden = require('../model/Warden');

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized: No user ID found.' });
            }

            let user = await User.findById(userId).populate('roles');

            // Database restores can preserve a user account while assigning it a
            // new MongoDB _id. The signed token still contains the verified email,
            // so resolve that current account in the same way as get-currentuser-data.
            if (!user && req.user?.email) {
                user = await User.findOne({ email: req.user.email }).populate('roles');

                if (user) {
                    // Controllers after this middleware must use the current ID,
                    // not the obsolete ID embedded in the pre-restore token.
                    req.user.id = user._id.toString();
                }
            }

            if (!user) {
                // The route exists, but the bearer token points at a user that no
                // longer exists (for example after a database restore). Treat this
                // as an invalid session so clients can sign the user out instead of
                // reporting every protected API endpoint as missing.
                return res.status(401).json({
                    code: 'AUTH_USER_NOT_FOUND',
                    message: 'Authentication session is no longer valid. Please sign in again.'
                });
            }

            const allPermissions = user.roles.flatMap(role => role.permissions);

            // Allow wardens to perform room-assignment actions even when their Role document
            // doesn't explicitly list the 'assign-room-special' permission. This is a focused
            // fallback to avoid blocking typical warden workflows while roles are being managed.
            if (requiredPermission === 'assign-room-special') {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('warden')) {
                    return next();
                }
            }

            // Extra needs: allow wardens to view and decide extra-needs requests even if the
            // permission strings are missing from Role documents.
            if (requiredPermission === 'std-extra-needs' || requiredPermission === 'approve-needs') {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('warden')) {
                    return next();
                }

                // Some deployments have warden users with an incorrect Role assignment.
                // If the user is actually linked to a Warden record, allow these warden-only actions.
                const wardenRecord = await Warden.findOne({ userId }).select('_id').lean();
                if (wardenRecord) {
                    return next();
                }
            }

            // Payments: allow privileged roles to read payments even if the permission string
            // hasn't been added to the Role documents yet.
            if (requiredPermission === 'view-payments') {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('admin') || roleNames.includes('director')) {
                    return next();
                }
            }

            // Backups: allow privileged roles to manage backup settings even if the permission
            // string hasn't been added to the Role documents yet.
            if (requiredPermission === 'manage-backups') {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('admin') || roleNames.includes('director')) {
                    return next();
                }
            }

            // Rooms/Hostels: allow admins to update room capacity and count
            if (requiredPermission === 'update-room-capasity' || requiredPermission === 'update-room-count') {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('admin') || roleNames.includes('director')) {
                    return next();
                }
            }

            // Student self-service: allow student users to access their own needs and
            // emergency contact endpoints even when the permission strings haven't been
            // explicitly added to the student Role document.
            const studentSelfPermissions = [
                'get-student-needs',
                'student-create-needs',
                'create-emergency-contact',
                'emergency-contact',
            ];
            if (studentSelfPermissions.includes(requiredPermission)) {
                const roleNames = user.roles.map(r => r.name);
                if (roleNames.includes('student')) {
                    return next();
                }
            }

            if (!allPermissions.includes(requiredPermission)) {
                // Debug logging to help identify permission issues
                console.warn('[Permission Denied] userId:', userId, 'required:', requiredPermission);
                console.warn('[Permission Denied] user roles:', user.roles.map(r => ({ name: r.name, permissions: r.permissions })));
                console.warn('[Permission Denied] aggregated permissions:', allPermissions);
                return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
            }

            next();
        } catch (err) {
            console.error('Permission Check Error:', err);
            res.status(500).json({ message: 'Internal Server Error during permission check.' });
        }
    };
};

module.exports = checkPermission;
