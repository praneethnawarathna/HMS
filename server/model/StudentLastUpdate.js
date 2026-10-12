const mongoose = require('mongoose');

const StudentLastUpdateSchema = new mongoose.Schema({
    no: String,
    enrolmentNo: { type: String },
    name: String,
    title: String,
    lastName: String,
    initials: String,
    fullName: String,
    alDistrict: String,
    sex: String,
    medium: String,
    nic: String,
    address1: String,
    address2: String,
    address3: String,
    fullAddress: String,
    email: String,
    phone1: String,
    phone2: String,
    intake: String,
    dateOfEnrolment: Date,
    distance: Number,
    lastupdateAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StudentLastUpdate', StudentLastUpdateSchema);
