const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const checkPermission = require('../middlewares/checkPermissionMiddleware');
const AdminController = require('../controller/adminController');
const BackupSettingsController = require('../controller/backupSettingsController');
const backupUpload = require('../middlewares/BackupUploadMiddleware');

const router = express.Router();

// Admin: payments (read-only)
router.get('/payments', authMiddleware, checkPermission('view-payments'), AdminController.getPayments);
// Admin: export payments as Excel
router.get('/payments/export', authMiddleware, checkPermission('view-payments'), AdminController.exportPayments);
// Admin: get all student extra needs with enrollment info, email, hostel, and room
router.get('/student-extra-needs', authMiddleware, AdminController.getStudentExtraNeeds);
// Admin: directly add a student to special needs, making them eligible and appending to excel queue
router.post('/add-special-need', authMiddleware, AdminController.addSpecialNeed);

// Admin: backup options
router.get('/backup-settings', authMiddleware, checkPermission('manage-backups'), BackupSettingsController.getBackupSettings);
router.put('/backup-settings', authMiddleware, checkPermission('manage-backups'), BackupSettingsController.updateBackupSettings);
router.get('/download-database', authMiddleware, checkPermission('manage-backups'), BackupSettingsController.downloadFullDatabase);
router.post('/restore-backup', authMiddleware, checkPermission('manage-backups'), backupUpload.single('file'), BackupSettingsController.restoreBackup);

module.exports = router;
