const Warden = require('../model/Warden');
const mongoose = require('mongoose');

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

function toIdVariants(id) {
    if (!id) return [];
    const list = Array.isArray(id) ? id : [id];
    const results = new Set();
    for (const item of list) {
        if (!item) continue;
        const str = item.toString().trim();
        if (!str) continue;
        results.add(str);
        if (mongoose.Types.ObjectId.isValid(str)) {
            try {
                results.add(new mongoose.Types.ObjectId(str));
            } catch {}
        }
    }
    return Array.from(results);
}

function buildDualIdFilter(fieldName, ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    const variants = toIdVariants(list);
    return { [fieldName]: { $in: variants } };
}

module.exports = {
    getActiveWardenAssignments,
    getActiveWardenHostelIds,
    toIdVariants,
    buildDualIdFilter,
};