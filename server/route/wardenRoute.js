const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const checkPermission = require('../middlewares/checkPermissionMiddleware');
const WardenController = require('../controller/wardenController');

const router = express.Router();

// Existing routes
router.get('/std-extra-needs', authMiddleware, checkPermission('std-extra-needs'), WardenController.getstdextraneeds)

router.post('/approve-need/:id', authMiddleware, checkPermission('approve-needs'), WardenController.approveneeds)

router.post('/reject-need/:id', authMiddleware, checkPermission('approve-needs'), WardenController.rejectneeds)

router.get('/all-rooms', authMiddleware, checkPermission('rooms-for-students'), WardenController.getallwardenrooms)

router.post('/assign-room-special', authMiddleware, checkPermission('assign-room-special'), WardenController.assignstdtorooms_via_sp)

router.get('/assigned-students', authMiddleware, checkPermission('assigned-all-students'), WardenController.assigned_students)

// Unassign a student from a room (by allocation id)
router.post('/unassign-student/:id', authMiddleware, checkPermission('assign-room-special'), WardenController.unassign_student)

router.post('/student-assign-to-rooms', authMiddleware, checkPermission('student-assign-to-rooms'), WardenController.assign_students_room)

// Warden Management Routes (Admin only)
// Assign selected students to a specific room (selected room)
router.post('/assign-students-to-room', authMiddleware, checkPermission('assign-room-special'), WardenController.assign_students_to_room_specific);

router.get('/get-all-wardens', authMiddleware, checkPermission('manage-wardens'), WardenController.getAllWardens)

router.get('/get-warden/:id', authMiddleware, checkPermission('manage-wardens'), WardenController.getWardenById)

router.post('/create-warden', authMiddleware, checkPermission('manage-wardens'), WardenController.createWarden)

router.post('/update-warden/:id', authMiddleware, checkPermission('manage-wardens'), WardenController.updateWarden)

router.post('/delete-warden/:id', authMiddleware, checkPermission('manage-wardens'), WardenController.deleteWarden)

// Payments - warden collection
router.post('/collect-payment', authMiddleware, WardenController.collect_payment)
router.get('/payments', authMiddleware, WardenController.getPayments)
router.get('/payments/export', authMiddleware, WardenController.exportPayments)
router.put('/payments/:id/mark-paid', authMiddleware, WardenController.markPaid)

module.exports = router;