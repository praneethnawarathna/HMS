const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
    regNo: { type: String },  // Student enrollment number (e.g., "A/23/001")
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },  // Reference to Student document
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    hostelID: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },    
    academicYear: String,
    inDate: Date,
    outDate: Date,
    note: String,
    active: Boolean
});

module.exports = mongoose.model('Allocation', allocationSchema);
