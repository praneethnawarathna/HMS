const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    regNo: { type: String, ref: 'Student', index: true },
    firstName: String,
    surname: String,
    relationship: String,
    telNo: String,
    address: {
        houseNo: String,
        street: String,
        locality: String,
        city: String,
        postcode: String
    },
    active: Boolean
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
