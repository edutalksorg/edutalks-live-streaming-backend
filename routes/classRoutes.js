const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), classController.createClass);
router.get('/all', verifyToken, classController.getAllClasses);
router.get('/student', verifyToken, authorizeRoles('student'), classController.getStudentClasses);
router.get('/instructor/:instructorId', verifyToken, classController.getInstructorClasses);
router.get('/:id', verifyToken, classController.getClassById);

module.exports = router;
