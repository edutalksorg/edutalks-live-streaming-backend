const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/dashboard/stats', verifyToken, authorizeRoles('super_admin'), superAdminController.getDashboardStats);

module.exports = router;
