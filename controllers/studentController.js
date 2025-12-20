const studentController = {
    getDashboard: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const studentId = req.user.id;

            // 1. Get Student's Grade
            const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [studentId]);
            if (users.length === 0) return res.status(404).json({ message: 'Student not found' });
            const grade = users[0].grade;

            // 2. Get Stats (Strictly Batch-Specific and Expiry-Aware)
            const [classesCount] = await db.query(`
                SELECT COUNT(*) as count FROM live_classes lc 
                JOIN batches b ON lc.instructor_id = b.instructor_id AND lc.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                WHERE sb.student_id = ? AND lc.status = "live"
            `, [studentId]);

            const [examsCount] = await db.query(`
                SELECT COUNT(*) as count FROM exams e 
                JOIN batches b ON e.instructor_id = b.instructor_id AND e.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                WHERE sb.student_id = ? AND e.date >= CURDATE() AND (e.expiry_date IS NULL OR e.expiry_date >= NOW())
            `, [studentId]);

            const [notesCount] = await db.query(`
                SELECT COUNT(*) as count FROM notes n 
                JOIN batches b ON n.uploaded_by = b.instructor_id AND n.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                WHERE sb.student_id = ?
            `, [studentId]);

            // 3. Get Assigned Batches & Subjects
            const [batches] = await db.query(`
                SELECT b.id as batch_id, b.name as batch_name, s.name as subject_name, u.name as instructor_name
                FROM student_batches sb
                JOIN batches b ON sb.batch_id = b.id
                JOIN subjects s ON b.subject_id = s.id
                JOIN users u ON b.instructor_id = u.id
                WHERE sb.student_id = ?
            `, [studentId]);

            // 4. Get Upcoming Classes (Strictly Batch-Specific)
            const [upcomingClasses] = await db.query(`
                SELECT lc.*, s.name as subject_name, u.name as instructor_name
                FROM live_classes lc
                JOIN batches b ON lc.instructor_id = b.instructor_id AND lc.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                JOIN subjects s ON lc.subject_id = s.id
                JOIN users u ON lc.instructor_id = u.id
                WHERE sb.student_id = ? AND lc.start_time >= NOW()
                ORDER BY lc.start_time ASC
                LIMIT 5
            `, [studentId]);

            res.json({
                grade,
                stats: {
                    liveNow: classesCount[0].count,
                    upcomingExams: examsCount[0].count,
                    studyMaterials: notesCount[0].count
                },
                batches,
                upcomingClasses
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getProfile: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const studentId = req.user.id;

            // 1. Get User Details
            const [users] = await db.query(`
                SELECT id, name, email, phone, grade, plan_name, subscription_expires_at, created_at 
                FROM users WHERE id = ?
            `, [studentId]);

            if (users.length === 0) return res.status(404).json({ message: 'User not found' });

            // 2. Get Payment History
            const [payments] = await db.query(`
                SELECT id, order_id, amount, status, created_at 
                FROM payments WHERE user_id = ? 
                ORDER BY created_at DESC
            `, [studentId]);

            res.json({
                user: users[0],
                payments
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getSubjects: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const studentId = req.user.id;

            // Get Student's Grade
            const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [studentId]);
            if (users.length === 0) return res.status(404).json({ message: 'Student not found' });
            const grade = users[0].grade;

            // Get Subjects for Grade
            const [subjects] = await db.query(`
                SELECT s.id, s.name, (SELECT COUNT(*) FROM notes WHERE subject_id = s.id) as materials_count
                FROM subjects s
                WHERE s.grade = ? OR s.class_id = (SELECT id FROM classes WHERE name = ?)
            `, [grade, grade]);

            res.json(subjects);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getSubjectsFull: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const studentId = req.user.id;

            // 1. Get Student's Grade
            const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [studentId]);
            if (users.length === 0) return res.status(404).json({ message: 'Student not found' });

            let grade = users[0].grade;
            console.log(`[getSubjectsFull] Fetching for student ${studentId}, grade: ${grade}`);

            if (!grade) {
                return res.json([]); // No grade, no subjects
            }

            // 2. Get Subjects (More robust)
            const [subjects] = await db.query(`
                SELECT id, name FROM subjects 
                WHERE grade = ? OR class_id = (SELECT id FROM classes WHERE name = ? OR name LIKE ?)
            `, [grade, grade, `%${grade}%`]);

            console.log(`[getSubjectsFull] Found ${subjects.length} subjects`);

            // 3. Get Notes for Assigned Batches
            const [notes] = await db.query(`
                SELECT DISTINCT n.*, s.id as subject_id 
                FROM notes n 
                JOIN batches b ON n.uploaded_by = b.instructor_id AND n.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                JOIN subjects s ON n.subject_id = s.id
                WHERE sb.student_id = ?
            `, [studentId]);

            // 4. Get Exams for Assigned Batches (Expiry-Aware)
            const [exams] = await db.query(`
                SELECT DISTINCT e.*, s.id as subject_id 
                FROM exams e 
                JOIN batches b ON e.instructor_id = b.instructor_id AND e.subject_id = b.subject_id
                JOIN student_batches sb ON b.id = sb.batch_id
                JOIN subjects s ON e.subject_id = s.id
                WHERE sb.student_id = ? AND (e.expiry_date IS NULL OR e.expiry_date >= NOW())
            `, [studentId]);

            // 5. Get Submissions
            const [submissions] = await db.query('SELECT * FROM exam_submissions WHERE student_id = ?', [studentId]);

            // 6. Assemble
            const data = subjects.map(s => ({
                ...s,
                notes: notes.filter(n => n.subject_id === s.id),
                exams: exams.filter(e => e.subject_id === s.id).map(e => {
                    const sub = submissions.find(su => su.exam_id === e.id);
                    return {
                        ...e,
                        status: sub ? (sub.status === 'graded' ? 'Completed' : 'Pending') : 'Attempt Now',
                        score: sub ? sub.score : null
                    };
                })
            }));

            // Handle independent items (if any instructor uploaded without subject)
            // For now, we only show subject-linked ones to keep it clean.

            res.json(data);
        } catch (err) {
            console.error("Error in getSubjectsFull:", err);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = studentController;
