import React from 'react';
import StudentSpecialNeed from './StudentSpecialNeed';

/**
 * Standalone Student Special Needs Page
 * Strictly isolated for student users:
 * Contains ONLY the student medical & health requirements form,
 * room allocation validation check, and submitted request history.
 * Contains ZERO admin metrics, zero counters, and zero admin tabs.
 */
const StudentSpecialNeedPage = () => {
    return (
        <div className="w-full">
            <StudentSpecialNeed />
        </div>
    );
};

export default StudentSpecialNeedPage;

