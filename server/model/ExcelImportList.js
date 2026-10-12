const mongoose = require('mongoose');

// Stores the currently active Excel-imported list of enrolment numbers
// Only one active list at a time (replaces previous on new import)
const ExcelImportListSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    enrolmentNumbers: [{ type: String }],
    importedBy: { type: String, ref: 'User' },
    importedAt: { type: Date, default: Date.now },
    totalImported: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    label: { type: String, default: '' },  // optional note/label for the import
});

module.exports = mongoose.model('ExcelImportList', ExcelImportListSchema);
