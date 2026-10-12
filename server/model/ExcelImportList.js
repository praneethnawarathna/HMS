const mongoose = require('mongoose');

// Stores the currently active Excel-imported list of enrolment numbers
// Only one active list at a time (replaces previous on new import)
const ExcelImportListSchema = new mongoose.Schema({
    enrolmentNumbers: [{ type: String }],
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    importedAt: { type: Date, default: Date.now },
    totalImported: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    label: { type: String, default: '' },  // optional note/label for the import
});

module.exports = mongoose.model('ExcelImportList', ExcelImportListSchema);
