const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const doubtController = require('../controllers/doubtController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/doubts/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Student Routes
router.post('/raise', verifyToken, authorizeRoles('student'), doubtController.raiseDoubt);
router.get('/student', verifyToken, authorizeRoles('student'), doubtController.getStudentDoubts);

// Instructor Routes
router.get('/instructor', verifyToken, authorizeRoles('instructor', 'super_instructor'), doubtController.getInstructorDoubts);

// Common Routes
router.get('/:doubtId', verifyToken, doubtController.getDoubtDetails);
router.get('/:doubtId/messages', verifyToken, doubtController.getDoubtMessages);
router.post('/message', verifyToken, doubtController.sendMessage);
router.patch('/:doubtId/status', verifyToken, doubtController.resolveDoubt);

// Upload endpoint for images/audio
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/doubts/${req.file.filename}`;
    res.json({ fileUrl });
});

module.exports = router;
