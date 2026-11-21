const mongoose = require('mongoose');

const hostelAllocationSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.Mixed,
        default: () => new mongoose.Types.ObjectId()
    },
    studentId: { type: mongoose.Schema.Types.Mixed, ref: 'Student', required: true, index: true },
    student_id: { type: mongoose.Schema.Types.Mixed, ref: 'Student', index: true }, // alias for multi-year convention
    studyYear: { type: String, required: true, index: true },   // "1", "2", "3", "4" or "1st Year", etc.
    study_year: { type: String, index: true },                  // alias
    hostelId: { type: mongoose.Schema.Types.Mixed, ref: 'Hostel', index: true },
    hostel_id: { type: mongoose.Schema.Types.Mixed, ref: 'Hostel' },                 // alias
    roomId: { type: mongoose.Schema.Types.Mixed, ref: 'Room' },
    academicYear: String,
    status: {
        type: String,
        enum: ['Assigned', 'Pending', 'Not Assigned', 'Completed', 'Cancelled'],
        default: 'Not Assigned',
        index: true
    },
    active: { type: Boolean, default: true, index: true },
    inDate: { type: Date, default: Date.now },
    outDate: Date,
    note: String
}, { timestamps: true });

// Sync aliases before saving
hostelAllocationSchema.pre('save', function (next) {
    if (this.studentId && !this.student_id) this.student_id = this.studentId;
    if (this.student_id && !this.studentId) this.studentId = this.student_id;
    if (this.studyYear && !this.study_year) this.study_year = this.studyYear;
    if (this.study_year && !this.studyYear) this.studyYear = this.study_year;
    if (this.hostelId && !this.hostel_id) this.hostel_id = this.hostelId;
    if (this.hostel_id && !this.hostelId) this.hostelId = this.hostel_id;
    next();
});

module.exports = mongoose.model('HostelAllocation', hostelAllocationSchema);
