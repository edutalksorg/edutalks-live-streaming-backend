const emailService = require('../services/emailService');

const doubtController = {
    raiseDoubt: async (req, res) => {
        const db = req.app.locals.db;
        const studentId = req.user.id;
        const { subject_id, title, message, message_type, file_url, audio_url } = req.body;

        try {
            // 1. Find assigned instructor for this subject and student
            const [batches] = await db.query(`
                SELECT b.instructor_id 
                FROM student_batches sb
                JOIN batches b ON sb.batch_id = b.id
                WHERE sb.student_id = ? AND b.subject_id = ?
                LIMIT 1
            `, [studentId, subject_id]);

            if (batches.length === 0) {
                return res.status(400).json({ message: 'No instructor assigned for this subject.' });
            }

            const instructorId = batches[0].instructor_id;

            // 2. Create Doubt Thread
            const [doubtResult] = await db.query(
                'INSERT INTO doubts (student_id, instructor_id, subject_id, title) VALUES (?, ?, ?, ?)',
                [studentId, instructorId, subject_id, title]
            );

            const doubtId = doubtResult.insertId;

            // 3. Create First Message (Text or Image)
            await db.query(
                'INSERT INTO doubt_messages (doubt_id, sender_id, message, message_type, file_url) VALUES (?, ?, ?, ?, ?)',
                [doubtId, studentId, message, message_type || 'text', file_url || null]
            );

            // 4. Create Second Message if Audio exists
            if (audio_url) {
                await db.query(
                    'INSERT INTO doubt_messages (doubt_id, sender_id, message, message_type, file_url) VALUES (?, ?, ?, ?, ?)',
                    [doubtId, studentId, '', 'audio', audio_url]
                );
            }

            const io = req.app.locals.io;
            if (io) io.emit('global_sync', { type: 'doubts', action: 'create', studentId });

            res.status(201).json({ message: 'Doubt raised successfully', doubtId });

            // 4. Send Email Notification to Instructor (In background)
            try {
                const [details] = await db.query(`
                    SELECT u.email as instructor_email, u.name as instructor_name, 
                           s.name as subject_name,
                           (SELECT name FROM users WHERE id = ?) as student_name
                    FROM users u
                    JOIN subjects s ON s.id = ?
                    WHERE u.id = ?
                `, [studentId, subject_id, instructorId]);

                if (details.length > 0) {
                    const d = details[0];
                    await emailService.sendDoubtNotification(
                        d.instructor_email,
                        d.instructor_name,
                        d.student_name,
                        d.subject_name,
                        title
                    );
                }
            } catch (emailErr) {
                console.error('Failed to send doubt notification email:', emailErr);
            }

        } catch (err) {
            console.error('Error raising doubt:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudentDoubts: async (req, res) => {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        try {
            const [doubts] = await db.query(`
                SELECT d.*, s.name as subject_name, u.name as instructor_name,
                       (SELECT message FROM doubt_messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM doubt_messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message_at
                FROM doubts d
                JOIN subjects s ON d.subject_id = s.id
                JOIN users u ON d.instructor_id = u.id
                WHERE d.student_id = ?
                ORDER BY d.updated_at DESC
            `, [studentId]);

            res.json(doubts);
        } catch (err) {
            console.error('Error fetching student doubts:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getInstructorDoubts: async (req, res) => {
        const db = req.app.locals.db;
        const instructorId = req.user.id;

        try {
            const [doubts] = await db.query(`
                SELECT d.*, s.name as subject_name, u.name as student_name,
                       (SELECT message FROM doubt_messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM doubt_messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message_at
                FROM doubts d
                JOIN subjects s ON d.subject_id = s.id
                JOIN users u ON d.student_id = u.id
                WHERE d.instructor_id = ?
                ORDER BY d.status ASC, d.updated_at DESC
            `, [instructorId]);

            res.json(doubts);
        } catch (err) {
            console.error('Error fetching instructor doubts:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getDoubtMessages: async (req, res) => {
        const db = req.app.locals.db;
        const { doubtId } = req.params;

        try {
            const [messages] = await db.query(`
                SELECT dm.*, u.name as sender_name, u.role_id
                FROM doubt_messages dm
                JOIN users u ON dm.sender_id = u.id
                WHERE dm.doubt_id = ?
                ORDER BY dm.id ASC
            `, [doubtId]);

            res.json(messages);
        } catch (err) {
            console.error('Error fetching messages:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    sendMessage: async (req, res) => {
        const db = req.app.locals.db;
        const senderId = req.user.id;
        const { doubtId, message, message_type, file_url } = req.body;

        try {
            await db.query(
                'INSERT INTO doubt_messages (doubt_id, sender_id, message, message_type, file_url) VALUES (?, ?, ?, ?, ?)',
                [doubtId, senderId, message, message_type || 'text', file_url || null]
            );

            // Update doubt's updated_at
            await db.query('UPDATE doubts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [doubtId]);

            const io = req.app.locals.io;
            if (io) io.emit('global_sync', { type: 'doubts', action: 'message', doubtId });

            res.status(201).json({ message: 'Message sent' });

        } catch (err) {
            console.error('Error sending message:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    resolveDoubt: async (req, res) => {
        const db = req.app.locals.db;
        const { doubtId } = req.params;
        const { status } = req.body; // 'resolved' or 'pending'

        try {
            await db.query('UPDATE doubts SET status = ? WHERE id = ?', [status, doubtId]);
            const io = req.app.locals.io;
            if (io) io.emit('global_sync', { type: 'doubts', action: 'resolve', doubtId });

            res.json({ message: `Doubt marked as ${status}` });

            // Send notification if resolved
            if (status === 'resolved') {
                try {
                    const [details] = await db.query(`
                        SELECT u.email as student_email, u.name as student_name, d.title
                        FROM doubts d
                        JOIN users u ON d.student_id = u.id
                        WHERE d.id = ?
                    `, [doubtId]);

                    if (details.length > 0) {
                        const d = details[0];
                        await emailService.sendDoubtResolvedNotification(
                            d.student_email,
                            d.student_name,
                            d.title
                        );
                    }
                } catch (emailErr) {
                    console.error('Failed to send doubt resolved email:', emailErr);
                }
            }
        } catch (err) {
            console.error('Error updating doubt status:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getDoubtDetails: async (req, res) => {
        const db = req.app.locals.db;
        const { doubtId } = req.params;

        try {
            const [doubt] = await db.query(`
                SELECT d.*, s.name as subject_name, u.name as student_name, ui.name as instructor_name
                FROM doubts d
                JOIN subjects s ON d.subject_id = s.id
                JOIN users u ON d.student_id = u.id
                JOIN users ui ON d.instructor_id = ui.id
                WHERE d.id = ?
            `, [doubtId]);

            if (doubt.length === 0) return res.status(404).json({ message: 'Doubt not found' });
            res.json(doubt[0]);
        } catch (err) {
            console.error('Error fetching doubt details:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = doubtController;
