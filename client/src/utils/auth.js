import { jwtDecode } from 'jwt-decode';

const KNOWN_ROLE_NAMES = new Set(['student', 'warden', 'admin', 'director']);
const CURRENT_USER_KEY = 'currentUser';
const AUTH_STORAGE_KEYS = ['login', 'loginE', CURRENT_USER_KEY, 'dashmenuID', 'profileImage'];

export function clearAuthentication() {
    try {
        AUTH_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    } catch {
        // Ignore storage failures.
    }
}

export function getRoleNamesFromRoles(roles) {
    const roleList = Array.isArray(roles) ? roles : [roles].filter(Boolean);

    return [...new Set(roleList
        .map(role => {
            const value = typeof role === 'string'
                ? role
                : role?.name || role?.role || role?._doc?.name;

            const normalized = String(value || '').trim().toLowerCase();
            return KNOWN_ROLE_NAMES.has(normalized) ? normalized : null;
        })
        .filter(Boolean))];
}

export function getRoleNames(userInfoOrRoles) {
    if (!userInfoOrRoles) return [];

    if (Array.isArray(userInfoOrRoles)) {
        return getRoleNamesFromRoles(userInfoOrRoles);
    }

    if (Array.isArray(userInfoOrRoles.roleNames)) {
        const roleNames = getRoleNamesFromRoles(userInfoOrRoles.roleNames);
        if (roleNames.length > 0) return roleNames;
    }

    return getRoleNamesFromRoles(userInfoOrRoles.roles);
}

export function cacheCurrentUser(user) {
    try {
        if (user) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        }
    } catch {
        // Ignore storage failures.
    }
}

export function getCachedUserInfo() {
    try {
        const cached = localStorage.getItem(CURRENT_USER_KEY);
        if (!cached) return null;

        const user = JSON.parse(cached);
        const roles = user?.roles || [];
        const roleNames = getRoleNames(user);
        return {
            username: user?.username || null,
            email: user?.email || null,
            roles,
            roleNames,
        };
    } catch {
        return null;
    }
}

export function getUserInfoFromToken() {
    const token = localStorage.getItem('login');
    // console.log("TOKEN FROM STORAGE:", token);
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        // console.log("DECODED TOKEN:", decoded);

        const userId = decoded.id || decoded._id || decoded.user?._id || decoded.user?.id;
        const expiresAt = Number(decoded.exp || 0);
        const isExpired = expiresAt > 0 && expiresAt * 1000 <= Date.now();

        if (!userId || isExpired) {
            clearAuthentication();
            return null;
        }

        const username = decoded.username || decoded.user?.username || null;
        const email = decoded.email || decoded.user?.email || null;
        const roles = decoded.roles || decoded.role || decoded.user?.roles || [];
        const roleNames = getRoleNamesFromRoles(roles);
        const cachedUser = roleNames.length === 0 ? getCachedUserInfo() : null;

        // NOTE: Removed strict check that required all of username, email, and roles
        // to be present. Some users (e.g. students) may have partially missing data
        // in their token, which was causing an immediate redirect back to login.
        // if (!username || !email || roles.length === 0) {
        //     return null;
        // }

        if (email) {
            localStorage.setItem('loginE', email);
        }

        return {
            id: String(userId),
            username: username || cachedUser?.username,
            email: email || cachedUser?.email,
            roles: roleNames.length > 0 ? roles : cachedUser?.roles || roles,
            roleNames: roleNames.length > 0 ? roleNames : cachedUser?.roleNames || [],
        };
    } catch (error) {
        console.error('Invalid token', error);
        clearAuthentication();
        return null;
    }
}
