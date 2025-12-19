const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/exams/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

router.post('/', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), examController.createExam);
router.get('/', verifyToken, examController.getExams);
router.get('/:id', verifyToken, examController.getExamById);

router.post('/submit', verifyToken, upload.single('file'), examController.submitExam);
router.get('/:id/submissions', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), examController.getExamSubmissions);
router.put('/submissions/:id/grade', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), examController.gradeSubmission);
module.exports = router;
