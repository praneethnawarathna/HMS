const mongoose = require('mongoose');

const HostelEligibilitySchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    eligibilityDate: { type: Date, default: Date.now },
    distance: { type: Number },
    status: { type: String, enum: ['Eligible', 'Not Eligible'], default: 'Not Eligible' }
}, { timestamps: true });

module.exports = mongoose.model('HostelEligibility', HostelEligibilitySchema);
