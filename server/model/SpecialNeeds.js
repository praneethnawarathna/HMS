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
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {timestamps: true});

module.exports = mongoose.model('SpecialNeeds', specialNeedsSchema);
