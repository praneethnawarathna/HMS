const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        enum: ['student', 'warden', 'admin', 'director'],
        default: 'warden'
    },
    permissions: [{
        type: String,
        required: true
    }]
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
