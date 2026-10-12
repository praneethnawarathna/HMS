const mongoose = require('mongoose');

const wardenSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    userId: { type: String, ref: 'User', index: true },
    hostelId: { type: String, ref: 'Hostel', index: true },
    startDate: Date,
    note: String,
    active: { type: Boolean, index: true }
});

module.exports = mongoose.model('Warden', wardenSchema);
