const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    regNo: { type: String, index: true },  // Student enrollment number (e.g., "A/23/001")
    studentId: { type: String, ref: 'Student', index: true },  // Reference to Student document
    roomId: { type: String, ref: 'Room' },
    hostelID: { type: String, ref: 'Hostel', index: true },    
    academicYear: String,
    inDate: Date,
    outDate: Date,
    note: String,
    active: { type: Boolean, index: true }
});

allocationSchema.index({ active: 1, hostelID: 1 });
allocationSchema.index({ active: 1, studentId: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);
