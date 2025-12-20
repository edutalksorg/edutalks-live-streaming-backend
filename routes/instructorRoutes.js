const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, authorizeRoles('instructor'), instructorController.getDashboard);
router.get('/students', verifyToken, authorizeRoles('instructor'), instructorController.getStudents);
router.get('/exams', verifyToken, authorizeRoles('instructor'), instructorController.getExams);
router.post('/exams', verifyToken, authorizeRoles('instructor'), instructorController.createExam);
router.put('/exams/:id', verifyToken, authorizeRoles('instructor'), instructorController.updateExam);
router.delete('/exams/:id', verifyToken, authorizeRoles('instructor'), instructorController.deleteExam);
router.get('/exams/:examId/submissions', verifyToken, authorizeRoles('instructor'), instructorController.getSubmissions);
router.post('/submissions/review', verifyToken, authorizeRoles('instructor'), instructorController.reviewSubmission);
router.post('/notes', verifyToken, authorizeRoles('instructor'), instructorController.uploadNotes);

module.exports = router;
