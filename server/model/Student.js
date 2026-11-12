const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    no: String,
    enrolmentNo: { type: String, unique: true },
    name: String,
    alDistrict: String,
    sex: String,
    nic: String,
    address1: String,
    address2: String,
    address3: String,
    fullAddress: String,
    intake: String,
    dateOfEnrolment: Date,
    distance: Number,
    transitDurationSec:  { type: Number, default: null }, // bus travel time in seconds (from Transit DM API)
    transitDurationText: { type: String, default: null }, // e.g. "2 hours 15 mins"
    distanceSource:      { type: String, default: null }, // 'transit-distance-matrix' | 'driving-distance-matrix' | 'nominatim-osrm' | etc.
    isAssign: { type: Boolean, default: false },
    eligibilityStatus: {
        type: String,
        enum: ['Eligible', 'Not Eligible', 'Assigned'],
        default: 'Not Eligible'
    },
    hostelAssignedDate: Date,
    department: String,
    batchYear: String,
    studyYear: String,
    hostelAllocations: [{
        studyYear: { type: String }, // e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
        study_year: { type: String },
        hostelId: { type: mongoose.Schema.Types.Mixed, ref: 'Hostel' },
        hostel_id: { type: mongoose.Schema.Types.Mixed, ref: 'Hostel' },
        roomId: { type: mongoose.Schema.Types.Mixed, ref: 'Room' },
        status: {
            type: String,
            enum: ['Assigned', 'Pending', 'Not Assigned', 'Completed', 'Cancelled', 'Upcoming'],
            default: 'Not Assigned'
        },
        active: { type: Boolean, default: false },
        inDate: Date,
        outDate: Date,
        note: String
    }],
    lastEditedBy: String,
    lastEditedAt: Date,
}, { timestamps: true });

// Ensure enrolment numbers follow the pattern "MG/YY/NNN"
StudentSchema.pre('save', function (next) {
    if (this.enrolmentNo) {
        // Upper‑case everything first
        let enrol = this.enrolmentNo.toString().toUpperCase().trim();
        // Split on non‑alphanumeric characters
        const parts = enrol.split(/[^A-Z0-9]/).filter(Boolean);
        if (parts.length === 3) {
            // Pad the numeric parts if needed (year 2 digits, number 3 digits)
            const prefix = parts[0];
            const year = parts[1].padStart(2, '0').slice(-2);
            const num = parts[2].padStart(3, '0').slice(-3);
            this.enrolmentNo = `${prefix}/${year}/${num}`;
        } else {
            // If it doesn't match, keep the original but still upper‑case
            this.enrolmentNo = enrol;
        }
    }
    next();
});

module.exports = mongoose.model('Student', StudentSchema);
