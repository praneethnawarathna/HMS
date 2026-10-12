const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    studentId: { type: String, ref: 'Student', index: true },
    hostelId: { type: String, ref: 'Hostel', index: true },
    roomId: { type: String, ref: 'Room' },
    academicYear: String,
    hallFee: { type: Number, default: 1500 },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending', index: true },
    paidDate: { type: Date, default: null },
    paidBy: { type: String, ref: 'User', default: null },
    // Legacy fields mapped for compatibility
    amount: { type: Number },
    type: { type: String },
    note: { type: String }
});

paymentSchema.index({ studentId: 1, hostelId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
