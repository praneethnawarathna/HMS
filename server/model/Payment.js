const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    academicYear: String,
    hallFee: { type: Number, default: 1500 },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    paidDate: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Legacy fields mapped for compatibility
    amount: { type: Number },
    type: { type: String },
    note: { type: String }
});

module.exports = mongoose.model('Payment', paymentSchema);
