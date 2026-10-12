const mongoose = require('mongoose');

const backupSettingSchema = new mongoose.Schema(
    {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly'],
            default: 'daily',
        },
        time: {
            type: String,
            default: '02:00', // HH:mm (server local time)
        },
        // 0 (Sun) - 6 (Sat). Only used when frequency === 'weekly'
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
            default: 0,
        },
        // Where backups are written on the server. If empty, server default is used.
        backupDir: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('BackupSetting', backupSettingSchema);
