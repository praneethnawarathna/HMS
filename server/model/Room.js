const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    roomID: { type: String, required: true, unique: true },
    currentOccupants: { type: Number, default: 0 },
    capasity: { type: Number, required: true, default: 4 },
    students: [{
        type: String,
        ref: 'Student'
    }],
    gender: {
        type: String,
        enum: ['Male', 'Female', 'REV'],
        required: true,
    },
    hostelID: { type: String, ref: 'Hostel', index: true },
    status: {
        type: String,
        enum: ['Availabe', 'Repair', 'Full'],
        default: 'Availabe'
    }
}, { timestamps: true });

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;