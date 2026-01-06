const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), classController.createClass);
router.get('/categories', classController.getCurriculumClasses); // Public route for registration
router.get('/categories/:className/subjects', classController.getSubjectsByClass); // Public route for registration
router.get('/all', verifyToken, classController.getAllClasses);
router.get('/student', verifyToken, authorizeRoles('student'), classController.getStudentClasses);
router.get('/instructor/:instructorId', verifyToken, classController.getInstructorClasses);
router.get('/:id/token', verifyToken, classController.getJoinToken);
router.post('/:id/start', verifyToken, authorizeRoles('instructor', 'super_instructor'), classController.startClass);
router.post('/:id/end', verifyToken, authorizeRoles('instructor', 'super_instructor'), classController.endClass);
router.post('/start-immediate', verifyToken, authorizeRoles('instructor', 'super_instructor'), classController.startImmediateClass);
router.get('/:id', verifyToken, classController.getClassById);



module.exports = router;
