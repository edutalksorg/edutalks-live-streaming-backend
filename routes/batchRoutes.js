const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all batches - Accessible by Super Admin and Super Instructor
router.get('/', verifyToken, authorizeRoles('super_admin', 'super_instructor'), batchController.getAllBatches);

// Update batch instructor - Super Instructor only (or Super Admin)
router.put('/:id/instructor', verifyToken, authorizeRoles('super_admin', 'super_instructor'), batchController.updateBatchInstructor);

module.exports = router;
