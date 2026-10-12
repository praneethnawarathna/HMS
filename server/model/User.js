const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    profileImage: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    password: { type: String, required: true },
    roles: [{
        type: String,
        ref: 'Role'
    }],
}, {timestamps: true });

module.exports = mongoose.model('User', userSchema);
