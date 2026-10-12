const Warden = require('../model/Warden');

async function getActiveWardenAssignments(userId) {
    if (!userId) {
        return [];
    }

    return Warden.find({ userId, active: true }).populate('hostelId', 'hostelID name gender');
}

function getActiveWardenHostelIds(assignments) {
    return assignments
        .map(assignment => assignment?.hostelId?._id || assignment?.hostelId)
        .filter(Boolean)
        .map(hostelId => hostelId.toString());
}

module.exports = {
    getActiveWardenAssignments,
    getActiveWardenHostelIds,
};