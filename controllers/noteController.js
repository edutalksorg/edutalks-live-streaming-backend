const path = require('path');
const fs = require('fs');

exports.uploadNote = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let { title, instructor_id, subject_id, description } = req.body;
        const file_path = `/uploads/notes/${req.file.filename}`;
        const db = req.app.locals.db;

        // Robustness: If subject_id is not a valid number (e.g. string from frontend dropdown failure),
        // look up the instructor's assigned subject from the batches table.
        console.log(`[uploadNote] Received subject_id: "${subject_id}", instructor_id: "${instructor_id}"`);
        if (!subject_id || isNaN(parseInt(subject_id))) {
            console.log(`[uploadNote] Invalid subject_id detected, attempting fallback...`);
            const [batches] = await db.query('SELECT subject_id FROM batches WHERE instructor_id = ? LIMIT 1', [instructor_id]);
            if (batches.length > 0) {
                console.log(`[uploadNote] Fallback found subject_id: ${batches[0].subject_id}`);
                subject_id = batches[0].subject_id;
            } else {
                console.log(`[uploadNote] No batches found for instructor, setting subject_id to null`);
                subject_id = null;
            }
        }

        await db.query(
            'INSERT INTO notes (title, description, file_path, uploaded_by, subject_id) VALUES (?, ?, ?, ?, ?)',
            [title, description || null, file_path, instructor_id, subject_id]
        );

        res.status(201).json({ message: 'Note uploaded successfully', file_path });
    } catch (err) {
        console.error("Error in uploadNote:", err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};

exports.getAllNotes = async (req, res) => {
    try {
        const [notes] = await req.app.locals.db.query('SELECT * FROM notes ORDER BY uploaded_at DESC');
        res.json(notes);
    } catch (err) {
        console.error("Error in getAllNotes:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentNotes = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        const [notes] = await db.query(`
            SELECT DISTINCT n.*, s.name as subject_name
            FROM notes n
            JOIN batches b ON n.uploaded_by = b.instructor_id AND n.subject_id = b.subject_id
            JOIN student_batches sb ON b.id = sb.batch_id
            LEFT JOIN subjects s ON n.subject_id = s.id
            WHERE sb.student_id = ?
            ORDER BY n.uploaded_at DESC
        `, [studentId]);

        res.json(notes);
    } catch (err) {
        console.error("Error in getStudentNotes:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstructorNotes = async (req, res) => {
    const { instructorId } = req.params;
    try {
        const [notes] = await req.app.locals.db.query(
            'SELECT * FROM notes WHERE uploaded_by = ? ORDER BY uploaded_at DESC',
            [instructorId]
        );
        res.json(notes);
    } catch (err) {
        console.error("Error in getInstructorNotes:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        await req.app.locals.db.query('DELETE FROM notes WHERE id = ?', [id]);
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error("Error in deleteNote:", err);
        res.status(500).json({ message: 'Server error' });
    }
};
