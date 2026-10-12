import { Navigate } from 'react-router-dom';
import { getRoleNames, getUserInfoFromToken } from '../../utils/auth';

// Function to check if user is authenticated
const isAuthenticated = () => {
    return !!getUserInfoFromToken();
};

const hasRoleAccess = (allowedRoles) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const roleNames = getRoleNames(getUserInfoFromToken());
    return allowedRoles.some(role => roleNames.includes(role.toLowerCase()));
};

const PrivateRoute = ({ element, allowedRoles }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    if (!hasRoleAccess(allowedRoles)) {
        return <Navigate to="/Dashboard/Home" replace />;
    }

    return element;
};



export default PrivateRoute;
