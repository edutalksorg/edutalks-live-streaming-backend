const express = require('express');
const router = express.Router();
const superInstructorController = require('../controllers/superInstructorController');
const superInstructorClassController = require('../controllers/superInstructorClassController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Dashboard
router.get('/dashboard', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getDashboard);
router.get('/instructors', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getAllInstructors);
router.get('/pending-instructors', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getPendingInstructors);
router.get('/students', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getStudents);
router.post('/approve-instructor', verifyToken, authorizeRoles('super_instructor'), superInstructorController.approveInstructor);
router.post('/assign-subject', verifyToken, authorizeRoles('super_instructor'), superInstructorController.assignInstructorToSubject);
router.post('/create-batch', verifyToken, authorizeRoles('super_instructor'), superInstructorController.createBatch);
router.post('/distribute-students', verifyToken, authorizeRoles('super_instructor'), superInstructorController.distributeStudents);
router.get('/batch/:batchId/details', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getBatchDetails);
router.post('/reset-assignments', verifyToken, authorizeRoles('super_instructor'), superInstructorController.resetAssignments);
router.post('/cleanup-strays', verifyToken, authorizeRoles('super_instructor'), superInstructorController.cleanupStrayBatches);

// Live Classes
router.post('/classes', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.createSuperInstructorClass);
router.get('/classes', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.getSuperInstructorClasses);
router.get('/classes/:id', verifyToken, superInstructorClassController.getClassById);
router.get('/classes/:id/token', verifyToken, superInstructorClassController.getJoinToken);
router.post('/classes/:id/start', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.startClass);
router.post('/classes/:id/end', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.endClass);
router.put('/classes/:id', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.updateClass);
router.delete('/classes/:id', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.deleteClass);
router.post('/classes/start-immediate', verifyToken, authorizeRoles('super_instructor'), superInstructorClassController.startImmediateClass);
router.get('/subjects', verifyToken, authorizeRoles('super_instructor'), superInstructorController.getSubjects);

module.exports = router;
