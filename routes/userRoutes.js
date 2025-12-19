const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all users - Accessible by Super Admin, Admin, and Super Instructor
router.get('/', verifyToken, authorizeRoles('super_admin', 'admin', 'super_instructor'), userController.getAllUsers);

// Create specific user (Admin, Instructor) - Super Admin and Super Instructor
router.post('/', verifyToken, authorizeRoles('super_admin', 'super_instructor'), userController.createUser);

// Toggle user status - Super Admin only
router.put('/:id/status', verifyToken, authorizeRoles('super_admin'), userController.toggleUserStatus);

// Delete user - Super Admin only
router.delete('/:id', verifyToken, authorizeRoles('super_admin'), userController.deleteUser);

module.exports = router;
