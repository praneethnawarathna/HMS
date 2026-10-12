const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const checkPermission = require('../middlewares/checkPermissionMiddleware');
const UserController = require('../controller/userController');

const router = express.Router();

router.get('/view-all-users', authMiddleware, checkPermission('view-all-users'), UserController.getallusers)

router.get('/view-one-user/:id', authMiddleware, checkPermission('view-one-user'), UserController.getoneuser)

router.post('/verify-user-email/:id', authMiddleware, checkPermission('verify-user-email'), UserController.verifyEmailBydir)

router.post('/update-user-status/:id', authMiddleware, checkPermission('update-user-status'), UserController.avtiveAnddactiveUser)

router.post('/update-user-role', authMiddleware, checkPermission('update-user-role'), UserController.updateUserRole)
router.post('/update-user/:id', authMiddleware, checkPermission('update-user-role'), UserController.updateUser)
router.post('/delete-user/:id', authMiddleware, checkPermission('update-user-role'), UserController.deleteUser)
// Accept update via request body as alternative
router.post('/update-user-body', authMiddleware, checkPermission('update-user-role'), UserController.updateUserByBody)
// router.post('/remove-user-role', authMiddleware, checkPermission('update-user-role'), UserController.removeRoleFromUser)

module.exports = router;