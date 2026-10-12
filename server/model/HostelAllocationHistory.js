const mongoose = require('mongoose');

const hostelAllocationHistorySchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    previousHostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    previousRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    newHostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    newRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    actionType: { 
        type: String, 
        enum: ['HOSTEL_CHANGE', 'UNASSIGN_HOSTEL', 'UNASSIGN_ROOM', 'ASSIGN_HOSTEL', 'ASSIGN_ROOM'],
        required: true
    },
    actionDate: { type: Date, default: Date.now },
    remark: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('HostelAllocationHistory', hostelAllocationHistorySchema);
