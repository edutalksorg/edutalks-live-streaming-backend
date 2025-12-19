const path = require('path');
const fs = require('fs');

exports.uploadNote = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { title, description, instructor_id, subject_id } = req.body;
        const file_url = `/uploads/notes/${req.file.filename}`;

        await req.app.locals.db.query(
            'INSERT INTO notes (title, description, file_url, instructor_id, subject_id) VALUES (?, ?, ?, ?, ?)',
            [title, description, file_url, instructor_id, subject_id || null]
        );

        res.status(201).json({ message: 'Note uploaded successfully', file_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllNotes = async (req, res) => {
    try {
        const [notes] = await req.app.locals.db.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstructorNotes = async (req, res) => {
    const { instructorId } = req.params;
    try {
        const [notes] = await req.app.locals.db.query('SELECT * FROM notes WHERE instructor_id = ? ORDER BY created_at DESC', [instructorId]);
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        await req.app.locals.db.query('DELETE FROM notes WHERE id = ?', [id]);
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
