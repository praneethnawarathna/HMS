const mongoose = require('mongoose');

const hostelAllocationHistorySchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    studentId: { type: String, ref: 'Student', required: true, index: true },
    previousHostelId: { type: String, ref: 'Hostel' },
    previousRoomId: { type: String, ref: 'Room' },
    newHostelId: { type: String, ref: 'Hostel' },
    newRoomId: { type: String, ref: 'Room' },
    actionType: { 
        type: String, 
        enum: ['HOSTEL_CHANGE', 'UNASSIGN_HOSTEL', 'UNASSIGN_ROOM', 'ASSIGN_HOSTEL', 'ASSIGN_ROOM'],
        required: true
    },
    actionDate: { type: Date, default: Date.now },
    remark: { type: String },
    changedBy: { type: String, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('HostelAllocationHistory', hostelAllocationHistorySchema);
