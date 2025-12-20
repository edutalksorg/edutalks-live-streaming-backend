const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');

exports.createClass = async (req, res) => {
    const { title, description, start_time, duration, instructor_id, subject_id } = req.body;
    const db = req.app.locals.db;

    // Generate unique channel name for Agora
    const agora_channel = `class_${instructor_id}_${Date.now()}`;

    try {
        const [result] = await db.query(
            'INSERT INTO live_classes (title, description, start_time, duration, instructor_id, subject_id, agora_channel) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, start_time, duration, instructor_id, subject_id || null, agora_channel]
        );

        // Notify Students logic
        if (subject_id) {
            try {
                // 1. Get Subject Name and Grade
                const [subjects] = await db.query('SELECT name, grade, class_id FROM subjects WHERE id = ?', [subject_id]);
                if (subjects.length > 0) {
                    const subject = subjects[0];
                    let grade = subject.grade;

                    // If grade is null, get it from class_id
                    if (!grade && subject.class_id) {
                        const [classes] = await db.query('SELECT name FROM classes WHERE id = ?', [subject.class_id]);
                        if (classes.length > 0) grade = classes[0].name;
                    }

                    if (grade) {
                        // 2. Get Students of that Grade
                        const [students] = await db.query('SELECT name, email FROM users WHERE grade = ?', [grade]);

                        // 3. Send Emails
                        for (const student of students) {
                            emailService.sendLiveClassNotification(student.email, student.name, subject.name, start_time);
                        }
                    }
                }
            } catch (notifyErr) {
                console.error("Failed to notify students:", notifyErr);
            }
        }

        res.status(201).json({ message: 'Class scheduled successfully', agora_channel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstructorClasses = async (req, res) => {
    const { instructorId } = req.params;
    const db = req.app.locals.db;
    try {
        const [classes] = await db.query(
            'SELECT * FROM live_classes WHERE instructor_id = ? ORDER BY start_time DESC',
            [instructorId]
        );
        res.json(classes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllClasses = async (req, res) => {
    try {
        const [classes] = await req.app.locals.db.query('SELECT * FROM live_classes ORDER BY start_time DESC');
        res.json(classes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getClassById = async (req, res) => {
    const { id } = req.params;
    try {
        const [classes] = await req.app.locals.db.query('SELECT * FROM live_classes WHERE id = ?', [id]);
        if (classes.length === 0) return res.status(404).json({ message: 'Class not found' });
        res.json(classes[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getStudentClasses = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        // 1. Get Student's Grade
        const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [studentId]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found' });
        const grade = users[0].grade;

        // 2. Get Classes for that Grade
        const [classes] = await db.query(`
            SELECT lc.*, s.name as subject_name, u.name as instructor_name
            FROM live_classes lc
            JOIN subjects s ON lc.subject_id = s.id
            JOIN users u ON lc.instructor_id = u.id
            WHERE s.grade = ? OR s.class_id = (SELECT id FROM classes WHERE name = ?)
            ORDER BY lc.start_time DESC
        `, [grade, grade]);

        res.json(classes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
