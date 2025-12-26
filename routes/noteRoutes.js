const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const noteController = require('../controllers/noteController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/notes/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Ensure controller functions exist before using them
if (!noteController.uploadNote || !noteController.getAllNotes) {
    console.error("Note Controller functions missing!");
}

router.post('/', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), upload.single('file'), noteController.uploadNote);
router.get('/', verifyToken, noteController.getAllNotes);
router.get('/student', verifyToken, authorizeRoles('student'), noteController.getStudentNotes);
router.get('/instructor/:instructorId', verifyToken, noteController.getInstructorNotes);

// If delete was intended, ensure it exists in controller first
if (noteController.deleteNote) {
    router.delete('/:id', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), noteController.deleteNote);
}

module.exports = router;
