const mongoose = require('mongoose');

const specialNeedsSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    regNo: { type: String, ref: 'Student', index: true },
    needs: { type: String, required: true },
    remark: { type: String, default: '' },
    isAccpeted: { type: Boolean, default: false },
    decision: {
        type: String,
        default: 'pending'
    },
    status: {
        type: String,
        default: 'Pending'
    },
    conditionType: { type: String, default: '' },
    issueCategory: { type: String, default: '' },
    student_id: { type: String, default: '' },
    hostel_id: { type: String, default: '' },
    room_no: { type: String, default: '' },
}, {timestamps: true});

module.exports = mongoose.model('SpecialNeeds', specialNeedsSchema);
