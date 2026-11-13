import React from 'react';
import { getRoleNames, getUserInfoFromToken } from '../../utils/auth';
import WardenDashboard from '../WardenDash/WardenDashboard';
import AdminDashboard from './AdminDashboard';

const DashHome = () => {
    const userInfo = getUserInfoFromToken();

    if (!userInfo) {
        return (
            <div className="bg-gray-100 p-4">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
                    <h1 className="text-xl font-semibold text-red-500">User not logged in</h1>
                    <p>Please log in to access the dashboard.</p>
                </div>
            </div>
        );
    }

    const roles = getRoleNames(userInfo);
    const isWarden = roles.includes('warden');

    if (isWarden) {
        return <WardenDashboard />;
    }

    return <AdminDashboard />;
};

export default DashHome;
