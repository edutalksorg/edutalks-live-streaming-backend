const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const examController = require('../controllers/examController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, authorizeRoles('student'), studentController.getDashboard);
router.get('/profile', verifyToken, authorizeRoles('student'), studentController.getProfile);
router.get('/subjects', verifyToken, authorizeRoles('student'), studentController.getSubjects);
router.get('/subjects-full', verifyToken, authorizeRoles('student'), studentController.getSubjectsFull);
router.get('/submissions/:id', verifyToken, authorizeRoles('student'), examController.getSubmissionResult);

module.exports = router;
