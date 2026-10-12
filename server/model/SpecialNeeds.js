const mongoose = require('mongoose');

const specialNeedsSchema = new mongoose.Schema({
    regNo: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
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
