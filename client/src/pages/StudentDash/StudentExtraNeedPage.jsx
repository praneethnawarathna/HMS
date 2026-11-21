import React from 'react';
import ExtraNeeds from './ExtraNeeds';

/**
 * Standalone Student Extra Needs Page
 * Strictly isolated for student users:
 * Contains ONLY the student maintenance & room repair request form,
 * room allocation validation check, and submitted maintenance history.
 * Contains ZERO admin metrics, zero counters, and zero admin tabs.
 */
const StudentExtraNeedPage = () => {
    return (
        <div className="w-full">
            <ExtraNeeds />
        </div>
    );
};

export default StudentExtraNeedPage;

