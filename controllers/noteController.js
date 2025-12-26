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

        // 5. Emit global sync event
        const io = req.app.locals.io;
        if (io) {
            io.emit('global_sync', { type: 'notes', action: 'create', data: { title, file_path } });
            console.log(`[uploadNote] Global sync emitted: notes.create`);
        }

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
    const userId = req.user.id;
    const userRole = req.user.role;
    const db = req.app.locals.db;

    console.log(`[deleteNote] Attempting to delete note ID: ${id} by User: ${userId} (${userRole})`);

    try {
        // 1. Get the note's file_path and owner
        const [notes] = await db.query('SELECT file_path, uploaded_by FROM notes WHERE id = ?', [id]);
        if (notes.length === 0) {
            console.log(`[deleteNote] Note ID: ${id} not found.`);
            return res.status(404).json({ message: 'Note not found' });
        }

        const note = notes[0];
        console.log(`[deleteNote] Found note. Owner: ${note.uploaded_by}, Path: ${note.file_path}`);

        // 2. Authorization Check: ONLY uploader or super_admin can delete
        const isOwner = parseInt(note.uploaded_by) === parseInt(userId);
        const isSuperAdmin = userRole === 'super_admin';

        if (!isSuperAdmin && !isOwner) {
            console.log(`[deleteNote] Unauthorized delete attempt. Owner: ${note.uploaded_by}, Requester: ${userId} (${userRole})`);
            return res.status(403).json({ message: 'Unauthorized: You can only delete materials you uploaded.' });
        }

        // 3. Delete from Database
        await db.query('DELETE FROM notes WHERE id = ?', [id]);
        console.log(`[deleteNote] Record deleted from DB.`);

        // 4. Physical File Cleanup
        // Clean up leading slash to avoid issues with path.join on some systems
        const relativePath = note.file_path.replace(/^\//, '');
        const absolutePath = path.join(__dirname, '..', relativePath);

        console.log(`[deleteNote] Attempting to delete file at: ${absolutePath}`);
        fs.unlink(absolutePath, (err) => {
            if (err) {
                console.error(`[deleteNote] Failed to delete physical file: ${absolutePath}`, err);
            } else {
                console.log(`[deleteNote] Physical file successfully deleted: ${absolutePath}`);
            }
        });

        // 5. Emit global sync event
        const io = req.app.locals.io;
        if (io) {
            io.emit('global_sync', { type: 'notes', action: 'delete', id: id });
            console.log(`[deleteNote] Global sync emitted: notes.delete (ID: ${id})`);
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error("Error in deleteNote:", err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};
