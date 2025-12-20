const express = require('express');
const router = express.Router();
const superInstructorController = require('../controllers/superInstructorController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Dashboard
router.get('/dashboard', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getDashboard);
router.get('/instructors', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getAllInstructors);
router.get('/pending-instructors', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getPendingInstructors);
router.get('/students', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getStudents);
router.post('/approve-instructor', verifyToken, authorizeRoles('super_instructor'), superInstructorController.approveInstructor);
router.post('/assign-subject', verifyToken, authorizeRoles('super_instructor'), superInstructorController.assignInstructorToSubject);
router.post('/distribute-students', verifyToken, authorizeRoles('super_instructor'), superInstructorController.distributeStudents);
router.get('/batch/:batchId/details', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getBatchDetails);
router.post('/reset-assignments', verifyToken, authorizeRoles('super_instructor'), superInstructorController.resetAssignments);

module.exports = router;
