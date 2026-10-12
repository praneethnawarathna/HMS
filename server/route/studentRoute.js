const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const checkPermission = require('../middlewares/checkPermissionMiddleware');
const StudentController = require('../controller/studentController');
const upload = require('../middlewares/UploadMiddleware');

const router = express.Router();

router.post('/create-student-sheet', authMiddleware, upload.single('file'), checkPermission('create-student-sheet'), StudentController.createstdviaSheet)
router.get('/upload-progress/:uploadId', authMiddleware, StudentController.getUploadProgress)
router.post('/upload-students-distance-google', authMiddleware, upload.single('file'), checkPermission('create-student-sheet'), StudentController.uploadStudentsDistanceGoogle)
router.post('/process-uploaded-file', authMiddleware, checkPermission('create-student-sheet'), StudentController.processUploadedFile)

// Debug route (no auth) — compare Directions vs Distance Matrix for a single origin
router.get('/debug-distance', StudentController.debugDistance)

router.post('/create-student-manually', authMiddleware, checkPermission('create-student-manually'), StudentController.createStudentManually);
router.delete('/delete-student/:id', authMiddleware, checkPermission('delete-student'), StudentController.deleteStudent);

router.get('/get-all-students-auth', authMiddleware, checkPermission('get-all-students-auth'), StudentController.studentGetall)

router.get('/get-student-byID/:id', authMiddleware, checkPermission('get-student-byID'), StudentController.getStudentById)

router.post('/update-Student/:id', authMiddleware, checkPermission('update-Student'), StudentController.updateStudent)

router.post('/student-create-needs', authMiddleware, checkPermission('student-create-needs'), StudentController.StudentCreateNeeds)

router.post('/create-emergency-contact', authMiddleware, checkPermission('create-emergency-contact'), StudentController.studentAddEmergencyContact)

router.get('/emergency-contact', authMiddleware, checkPermission('emergency-contact'), StudentController.getEmergencyContact)

router.get('/get-student-needs/:email', authMiddleware, checkPermission('get-student-needs'), StudentController.getNeedsStudents)

module.exports = router;