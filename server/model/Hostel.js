const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    hostelID: String,
    name: String,
    location: String,
    gender: String,
    roomCount: Number,
    warden: { type: String, ref: 'User' }
});

module.exports = mongoose.model('Hostel', hostelSchema);
