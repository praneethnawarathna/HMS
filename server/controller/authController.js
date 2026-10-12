const bcrypt = require('bcrypt');
const validator = require('validator')
const jwt = require('jsonwebtoken')
const crypto = require('crypto');
const Role = require('../model/Role');
const User = require('../model/User');
const Student = require('../model/Student');
const transporter = require('../utils/emailTransporter');
const UserOTP = require('../model/UserOTP');

const authController = {
    // signup
    signup: async (req, res) => {
        try {
            const {
                username,
                email,
                password,
            } = req.body

            if (!password || password.length < 6) {
                return res.json({ Error: "Password must be at least 6 characters long" });
            }

            // const emailRegex = /^[a-zA-Z0-9._%+-]+@pdn\.ac\.lk$/;
            // if (!emailRegex.test(email)) {
            //     return res.json({ Error: "Email must end with '@pdn.ac.lk'" });
            // }

            const checkUser = await User.findOne({
                $or: [
                    { username: username },
                    { email: email }
                ]
            });

            if (checkUser) {
                return res.json({ Error: "User already exists in the system" })
            }

            const getroleforsignup = await Role.findOne({ name: 'warden' })

            if (!getroleforsignup) {
                return res.json({ Error: "Default role 'warden' not found in system" });
            }

            const hashpass = await bcrypt.hash(password, 10)

            const newUser = new User({
                username: username,
                email: email,
                password: hashpass,
                roles: [getroleforsignup._id],
            })

            const resultNewUser = await newUser.save()

            if (resultNewUser) {
                const generateRandomCode = (length = 10) => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}';
                    let code = '';
                    for (let i = 0; i < length; i++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return code;
                };

                const verificationCode = generateRandomCode();

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Pdn Account Verification Code',
                    html: `
                            <p>Dear ${username},</p>
                            <p>Thank you for registering at the University of Peradeniya Hostel Management System.</p>
                            <p>Your Email verification code is:</p>
                            <h2 style="color:#7c340c;">${verificationCode}</h2>
                            <p>Please wait until your account is activated by an administrator.</p>
                            <br>
                            <p style="color:gray;">Do not share this code with anyone.</p>
                        `,
                };


                const hashotp = await bcrypt.hash(verificationCode, 10)

                const storeOTP = new UserOTP({
                    email: email,
                    otp: hashotp
                })

                const resultStoreOTP = await storeOTP.save()

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        return res.json({ Error: "Registration succeeded, but failed to send verification email." });
                    } else {
                        const tokenemailVerify = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5min' });

                        return res.json({
                            Status: "Success",
                            verifyToken: tokenemailVerify,
                            Message: "Registration successful. Verification code sent to your email. Verify Email Please wait and wait for activation."
                        });
                    }
                });
            }

            else {
                return res.json({ Error: "Internal Server Error while Creating User" })
            }
        }
        catch (err) {
            console.log(err)
        }
    },


    // verify otp for email verify
    otpverifyforemail: async (req, res) => {
        try {
            const { otp } = req.body;

            // 1. Get token from Authorization header
            const token = req.header('Authorization');
            if (!token || !token.startsWith('Bearer ')) {
                return res.json({ Error: "Missing or invalid token" });
            }

            // 2. Verify token and extract email
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            const email = decoded.email;

            // 3. Check for OTP record in DB
            const userOtpRecord = await UserOTP.findOne({ email });
            if (!userOtpRecord) {
                return res.json({ Error: "No OTP found for this email" });
            }

            // 4. Compare provided OTP with hashed OTP in DB
            const isMatch = await bcrypt.compare(otp, userOtpRecord.otp);
            if (!isMatch) {
                return res.json({ Error: "Invalid OTP" });
            }

            // 5. Mark email as verified & remove OTP from DB
            await User.updateOne({ email }, { emailVerified: true });
            await UserOTP.deleteOne({ email });

            res.json({ Status: "Success", Message: "Email verified successfully" });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.json({ Error: "Verification token expired" });
            }
            console.error(err);
            res.status(500).json({ Error: "Server error during email verification" });
        }
    },

    signin: async (req, res) => {
        try {
            const { email, password, identifier, loginMode } = req.body;
            const normalizedMode = String(loginMode || '').toLowerCase();
            const normalizedIdentifier = String(identifier || '').trim();
            const looksLikeStudentLogin = normalizedMode === 'student' || (normalizedIdentifier && !String(email || '').trim() && !normalizedIdentifier.includes('@'));

            let checkuser = null;

            const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const findStudentByEnrollment = async (enrolmentNo) => {
                const trimmed = String(enrolmentNo || '').trim();
                if (!trimmed) return null;
                const flexiblePattern = new RegExp(`^\\s*${escapeRegex(trimmed)}\\s*$`, 'i');

                return Student.findOne({
                    $or: [
                        { enrolmentNo: trimmed },
                        { enrolmentNo: trimmed.toUpperCase() },
                        { enrolmentNo: trimmed.toLowerCase() },
                        { enrolmentNo: { $regex: flexiblePattern } },
                        { enrolmentNo: { $regex: trimmed, $options: 'i' } },
                        { no: trimmed }
                    ]
                });
            };

            if (looksLikeStudentLogin) {
                const enrolmentNo = normalizedIdentifier;
                if (!enrolmentNo) {
                    return res.json({ Error: "Enrolment number is required for student login" });
                }

                const student = await findStudentByEnrollment(enrolmentNo);
                if (!student) {
                    return res.json({ Error: "Student not found for given enrolment number" });
                }

                // Use enrolmentNo as the username to find the User account
                const studentUsername = String(student.enrolmentNo || enrolmentNo).trim();

                checkuser = await User.findOne({
                    $or: [
                        { username: studentUsername },
                        { username: enrolmentNo },
                        { username: student.nic }
                    ]
                }).populate('roles');

                if (!checkuser) {
                    // Auto-create a User account for the student
                    const studentRole = await Role.findOne({ name: 'student' });
                    if (!studentRole) {
                        return res.json({ Error: "Student role not found" });
                    }

                    if (!studentUsername) {
                        return res.json({ Error: "Student username cannot be determined" });
                    }

                    // Generate a synthetic email since User model requires it
                    // Students don't have email in their record, so we use enrolmentNo-based placeholder
                    const syntheticEmail = `${studentUsername.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}@student.hms`;

                    // Check if this synthetic email already exists
                    const existingByEmail = await User.findOne({ email: syntheticEmail }).populate('roles');
                    if (existingByEmail) {
                        checkuser = existingByEmail;
                    } else {
                        const hashedPassword = await bcrypt.hash('12345678', 10);
                        const newStudentUser = new User({
                            username: studentUsername,
                            email: syntheticEmail,
                            emailVerified: true,
                            active: true,
                            password: hashedPassword,
                            roles: [studentRole._id],
                        });

                        checkuser = await newStudentUser.save();
                        checkuser = await User.findById(checkuser._id).populate('roles');
                    }
                }

                if (!checkuser) {
                    return res.json({ Error: "Student account not found" });
                }
            } else {
                const loginEmail = String(email || '').trim();
                if (!loginEmail) {
                    return res.json({ Error: "Email is required for staff login" });
                }

                checkuser = await User.findOne({ email: loginEmail }).populate('roles');

                if (!checkuser) {
                    return res.json({ Error: "The User not Found by Given Email Address" })
                }
            }

            let populatedRoles = checkuser.roles || [];
            if (populatedRoles.length > 0 && !populatedRoles[0].name) {
                const Role = require('../model/Role');
                const roleIds = populatedRoles.map(r => String(r._id || r));
                const allRoles = await Role.find({});
                populatedRoles = populatedRoles.map(r => {
                    const idStr = String(r._id || r);
                    const found = allRoles.find(ar => String(ar._id) === idStr);
                    return found || r;
                });
                checkuser.roles = populatedRoles;
            }
            const roleNames = populatedRoles.map(role => String(role.name || '').toLowerCase());
            const isStudentAccount = roleNames.includes('student');

            if (isStudentAccount && !looksLikeStudentLogin) {
                return res.json({ Error: "Student accounts must log in with Enrolment No" });
            }

            if (!isStudentAccount && looksLikeStudentLogin) {
                return res.json({ Error: "Only student accounts can use Enrolment No login" });
            }

            if (checkuser.emailVerified === false) {
                return res.json({ Error: "The Email Not Verified" })
            }

            if (checkuser.active === false) {
                return res.json({ Error: "The Account is not Active, wait for admin to active the account" })
            }

            const checkpass = await bcrypt.compare(password, checkuser.password)

            if (!checkpass) {
                return res.json({ Error: "The Password is Not Match" })
            }

            // Do not embed password hash in the token payload.
            const safeUser = {
                _id: checkuser._id,
                username: checkuser.username,
                email: checkuser.email,
                roles: roleNames,
                profileImage: checkuser.profileImage || ''
            };

            const token = jwt.sign({ 
                id: checkuser._id, 
                roles: roleNames, 
                role: roleNames, 
                user: safeUser 
            }, process.env.JWT_SECRET, { expiresIn: '10h' });

            if (token) {
                return res.json({ Status: "Success", Message: "Login Success", Token: token })
            }
            else {
                return res.json({ Error: "Internal Server Error while signin" })
            }
        }
        catch (err) {
            console.log(err)
        }
    },


    // forgetpass and send opt

    forgetpass: async (req, res) => {
        try {
            const { email } = req.body

            const checkuser = await User.findOne({ email: email })

            if (!checkuser) {
                return res.json({ Error: "User Cannot Find In System" })
            }

            const generateRandomCode = (length = 10) => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}';
                let code = '';
                for (let i = 0; i < length; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return code;
            };

            const verificationCode = generateRandomCode();

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Pdn Account Verification Code',
                html: `
                            <p>Dear ${checkuser.username},</p>
                            <p>The OTP for Password Reset</p>
                            <p>Your Password Resest verification code is:</p>
                            <h2 style="color:#7c340c;">${verificationCode}</h2>
                            <br>
                            <p style="color:gray;">Do not share this code with anyone.</p>
                        `,
            };


            const hashotp = await bcrypt.hash(verificationCode, 10)

            const storeOTP = new UserOTP({
                email: email,
                otp: hashotp
            })

            const deleteallotpsforemail = await UserOTP.findOneAndDelete({ email: email })

            const resultStoreOTP = await storeOTP.save()

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    return res.json({ Error: "Registration succeeded, but failed to send verification email." });
                } else {
                    return res.json({
                        Status: "Success",
                        Message: "Password Reset OTP has been send to your email Address, check emails"
                    });
                }
            });

        }
        catch (err) {
            console.log(err)
        }
    },

    // check and verify otp

    checkotpforforgetpass: async (req, res) => {
        try {
            const { email, otp } = req.body;

            const checkotp = await UserOTP.findOne({ email: email });

            // If OTP record not found
            if (!checkotp) {
                return res.json({ Error: 'OTP Not Found for this Email' });
            }

            // Compare OTP
            const isMatch = await bcrypt.compare(otp, checkotp.otp);
            if (!isMatch) {
                return res.json({ Error: 'OTP does not match' });
            }

            // Delete OTP record after successful verification
            const deleterecode = await UserOTP.findOneAndDelete({ email: email });

            if (deleterecode) {
                const tokenforgetpass = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5min' });

                return res.json({
                    Status: "Success",
                    Token: tokenforgetpass,
                    Message: "OTP Verified. You can now update your password within 5 minutes."
                });
            } else {
                return res.json({ Error: "Failed to delete OTP record" });
            }
        } catch (err) {
            console.error("OTP verification error:", err);
            return res.json({ Error: 'Server Error' });
        }
    },

    updatepasswordviaforgetpass: async (req, res) => {
        try {
            // 1. Get token from Authorization header
            const token = req.header('Authorization');
            if (!token || !token.startsWith('Bearer ')) {
                return res.json({ Error: "Missing or invalid token" });
            }

            // 2. Verify token and extract email
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            const tokenEmail = decoded.email;

            // 3. Extract email and newPassword from body
            const { newPassword, email } = req.body;

            // 4. Check if email from body matches token email
            if (!email || email !== tokenEmail) {
                return res.json({ Error: "Email mismatch" });
            }

            // 5. Find user
            const checkuser = await User.findOne({ email: email });
            if (!checkuser) {
                return res.json({ Error: "User not found" });
            }

            // 6. Validate newPassword presence
            if (!newPassword) {
                return res.json({ Error: "New password is required" });
            }

            // 7. Hash new password and update
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            checkuser.password = hashedPassword;
            await checkuser.save();

            return res.json({ Status: "Success", Message: "Password updated successfully" });
        } catch (err) {
            console.log("Password update error:", err);
            return res.json({ Error: "Something went wrong" });
        }
    },

    getmebyemail: async (req, res) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    Status: 'Fail',
                    Error: 'Unauthorized: User ID was not found'
                });
            }

            let user = await User.findById(userId)
                .select('-password')
                .populate('roles');

            if (!user && req.user?.email) {
                user = await User.findOne({ email: req.user.email })
                    .select('-password')
                    .populate('roles');
            }

            if (!user) {
                return res.status(401).json({
                    Status: 'Fail',
                    code: 'AUTH_USER_NOT_FOUND',
                    Error: 'Authentication session is no longer valid. Please sign in again.'
                });
            }

            let assignedHostels = [];

            const roleNames = Array.isArray(user.roles)
                ? user.roles
                    .map(role => String(role?.name || '').trim().toLowerCase())
                    .filter(Boolean)
                : [];

            if (roleNames.includes('warden')) {
                const {
                    getActiveWardenAssignments
                } = require('../utils/wardenAssignments');

                const assignments = await getActiveWardenAssignments(user._id);

                assignedHostels = assignments
                    .map(assignment => assignment.hostelId)
                    .filter(Boolean);
            }

            return res.status(200).json({
                Status: 'Success',
                Result: user,
                Hostels: assignedHostels
            });
        } catch (err) {
            console.error('getmebyemail error:', err);

            return res.status(500).json({
                Status: 'Fail',
                Error: 'Internal Server Error while getting current user'
            });
        }
    },

    updateProfilePicture: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ Status: 'Fail', Error: 'Unauthorized' });
            }

            if (!req.file) {
                return res.status(400).json({ Status: 'Fail', Error: 'Profile image file is required (field: profileImage)' });
            }

            const profileImage = `/uploads/profile-pictures/${req.file.filename}`;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { profileImage },
                { new: true }
            ).select('-password').populate('roles');

            if (!updatedUser) {
                return res.status(404).json({ Status: 'Fail', Error: 'User not found' });
            }

            return res.json({ Status: 'Success', Message: 'Profile picture updated successfully', Result: updatedUser });
        } catch (err) {
            console.error('updateProfilePicture error:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Internal server error' });
        }
    },

    updatepassviaDash: async (req, res) => {
        try {
            const { currentpass, newpass } = req.body;

            if (!currentpass || !newpass) {
                return res.json({ Error: "Current and new password are required" });
            }

            if (currentpass === newpass) {
                return res.json({ Error: "Current password and new password cannot be the same" });
            }

            const authHeader = req.headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.json({ Error: "Unauthorized: Missing or invalid token" });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.user.email;

            const user = await User.findOne({ email });
            if (!user) {
                return res.json({ Error: "User not found" });
            }

            const isMatch = await bcrypt.compare(currentpass, user.password);
            if (!isMatch) {
                return res.json({ Error: "Current password is incorrect" });
            }

            const hashedPassword = await bcrypt.hash(newpass, 10);

            user.password = hashedPassword;
            await user.save();

            return res.json({ Status: "Success", Message: "Password updated successfully" });
        } catch (err) {
            console.error(err);
            return res.json({ Error: "Internal Server Error" });
        }
    },



    // create new permissions
    createPermissions: async (req, res) => {
        try {
            const { role, permission } = req.body;

            if (!role || !permission) {
                return res.status(400).json({ Status: "Error", Message: "Role and Permission are required" });
            }

            // Support comma‑separated role names (e.g., "admin, director")
            const roleNames = role.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
            const results = [];

            for (const roleName of roleNames) {
                let existingRole = await Role.findOne({ name: roleName });
                if (!existingRole) {
                    const newRole = new Role({
                        name: roleName,
                        permissions: [permission]
                    });
                    const saved = await newRole.save();
                    results.push({ role: roleName, action: 'created', data: saved });
                } else {
                    if (!existingRole.permissions.includes(permission)) {
                        existingRole.permissions.push(permission);
                        await existingRole.save();
                        results.push({ role: roleName, action: 'updated', data: existingRole });
                    } else {
                        results.push({ role: roleName, action: 'unchanged', data: existingRole });
                    }
                }
            }

            return res.json({ Status: "Success", Message: "Permissions processed", results });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ Status: "Error", Message: err.message });
        }
    },

    getallrolesWithPermissions: async (req, res) => {
        try {
            const getalldata = await Role.find()

            return res.json({ Result: getalldata })
        }
        catch (err) {
            console.log(err)
        }
    },

    viewoneROleWithPermissions: async (req, res) => {
        try {
            const { id } = req.params

            const getdataone = await Role.findById(id)

            return res.json({ Result: getdataone })
        }
        catch (err) {
            console.log(err)
        }
    },

    deleteRolePermission: async (req, res) => {
        try {
            const { roleId, permission } = req.body;

            if (!roleId || !permission) {
                return res.json({ message: 'Role ID and permission are required' });
            }

            const updatedRole = await Role.findByIdAndUpdate(
                roleId,
                { $pull: { permissions: permission } },
                { new: true }
            );

            if (!updatedRole) {
                return res.json({ message: 'Role not found' });
            }

            res.json({
                Status: "Success",
                Message: 'Permission removed successfully',
                role: updatedRole,
            });
        }
        catch (err) {
            console.log(err)
        }
    }
};


module.exports = authController;
