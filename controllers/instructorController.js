const formatDateForMySQL = (dateStr) => {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
            return null;
        }
        return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
        return null;
    }
};

const instructorController = {
    getDashboard: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;

            // 1. Get Assigned Batches & Class Info
            const [batches] = await db.query(
                `SELECT b.id, b.name, b.student_count, b.subject_id, s.name as subject_name, 
                        c.name as class_name, s.grade 
                 FROM batches b 
                 JOIN subjects s ON b.subject_id = s.id 
                 JOIN classes c ON s.class_id = c.id
                 WHERE b.instructor_id = ?`,
                [instructorId]
            );

            // Construct Branding for Instructor (e.g. "Grade 6 Batches" or "UG - B.Tech Batches")
            // Instructors might teach multiple grades, but visually we just want a main header.
            // We'll take the distinct list of "Class Name" or "Grade"
            let distinctClasses = [...new Set(batches.map(b => {
                // Check if it's UG/PG flow
                const grade = b.grade || b.class_name;
                // If the class name looks like "Grade 6", keep it.
                // If it is "UG", try to see if subject implies a course, but usually batches are specific.
                // Simple logic: Use the Class Name from the DB.
                return b.class_name;
            }))];

            // Refined Logic for UG/PG:
            // If class_name is 'UG' or 'PG', we might want to append the subject's related course if consistent.
            // But usually, just "UG" or "Class 5" is enough for the header context.
            // Let's format it nicely.
            let displayClassName = distinctClasses.join(', ');
            if (distinctClasses.length === 1) {
                const cls = distinctClasses[0];
                if (!isNaN(parseFloat(cls))) {
                    displayClassName = `Grade ${cls}`;
                } else {
                    // e.g. "UG", "PG"
                    // If it's UG/PG, we can try to be more specific if all batches share a common "Category" 
                    // But typically "UG Instructor" is fine. 
                    // Let's just pass the raw class name if it's not a number.
                    displayClassName = cls;
                }
            } else if (distinctClasses.length === 0) {
                displayClassName = "No Active Classes";
            } else {
                displayClassName = `Multiple Grades (${distinctClasses.length})`;
            }

            // 2. Count Active Exams
            const [exams] = await db.query(
                'SELECT COUNT(*) as count FROM exams WHERE instructor_id = ?',
                [instructorId]
            );

            // 3. Count Pending Reviews
            // Submissions that don't have a review yet
            const [pendingReviews] = await db.query(
                `SELECT COUNT(*) as count 
                 FROM exam_submissions es
                 JOIN exams e ON es.exam_id = e.id
                 LEFT JOIN submission_reviews sr ON es.id = sr.submission_id
                 WHERE e.instructor_id = ? AND sr.id IS NULL`,
                [instructorId]
            );

            const totalStudents = batches.reduce((sum, b) => sum + (b.student_count || 0), 0);

            res.json({
                stats: {
                    totalStudents,
                    activeExams: exams[0].count,
                    pendingReviews: pendingReviews[0].count,
                    classesCount: 0 // Ideally fetch from a live_classes history table
                },
                batches,
                displayClassName
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching dashboard' });
        }
    },

    getStudents: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;

            const { batchId } = req.query;

            let query = `SELECT u.id, u.name, u.email, u.phone, b.name as batch_name, s.name as subject_name
                         FROM users u
                         JOIN student_batches sb ON u.id = sb.student_id
                         JOIN batches b ON sb.batch_id = b.id
                         JOIN subjects s ON b.subject_id = s.id
                         WHERE b.instructor_id = ?`;
            const params = [instructorId];

            if (batchId) {
                query += ' AND b.id = ?';
                params.push(batchId);
            }

            const [students] = await db.query(query, params);
            res.json(students);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching students' });
        }
    },

    getExams: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;

            const [exams] = await db.query(
                `SELECT e.*, 
                 DATE_FORMAT(e.date, '%Y-%m-%dT%H:%i:%s.000Z') as date,
                 DATE_FORMAT(e.expiry_date, '%Y-%m-%dT%H:%i:%s.000Z') as expiry_date,
                 s.name as subject_name 
                 FROM exams e 
                 LEFT JOIN subjects s ON e.subject_id = s.id 
                 WHERE e.instructor_id = ? 
                 ORDER BY e.created_at DESC`,
                [instructorId]
            );
            res.json(exams);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching exams' });
        }
    },

    createExam: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            let { title, date, expiry_date, duration, questions, total_marks, type, subject_id, attempts_allowed } = req.body;

            // Robustness: Handle invalid subject_id
            if (!subject_id || isNaN(parseInt(subject_id))) {
                const [batches] = await db.query('SELECT subject_id FROM batches WHERE instructor_id = ? LIMIT 1', [instructorId]);
                if (batches.length > 0) {
                    subject_id = batches[0].subject_id;
                }
            }

            const [result] = await db.query(
                `INSERT INTO exams (title, instructor_id, subject_id, date, expiry_date, duration, questions, total_marks, type, attempts_allowed) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, instructorId, subject_id, formatDateForMySQL(date), formatDateForMySQL(expiry_date), duration, JSON.stringify(questions), total_marks, type, attempts_allowed || 1]
            );

            const io = req.app.locals.io;
            io.emit('global_sync', { type: 'exams', action: 'create' });

            res.json({ message: 'Exam created successfully', examId: result.insertId });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error creating exam' });
        }
    },

    getSubmissions: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { examId } = req.params;

            // Verify exam ownership
            const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND instructor_id = ?', [examId, instructorId]);
            if (!exam.length) return res.status(403).json({ message: 'Unauthorized / Exam not found' });

            const [submissions] = await db.query(
                `SELECT es.*, 
                       DATE_FORMAT(es.submitted_at, '%Y-%m-%dT%H:%i:%s.000Z') as submitted_at,
                       u.name as student_name, u.email as student_email, sr.review_text, sr.score as reviewed_score, sr.reviewed_at,
                       (SELECT COUNT(*) FROM exam_submissions es2 WHERE es2.exam_id = es.exam_id AND es2.student_id = es.student_id AND es2.submitted_at <= es.submitted_at) as attempt_number
                 FROM exam_submissions es
                 JOIN users u ON es.student_id = u.id
                 LEFT JOIN submission_reviews sr ON es.id = sr.submission_id
                 WHERE es.exam_id = ?
                 ORDER BY es.submitted_at DESC`,
                [examId]
            );
            res.json(submissions);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching submissions' });
        }
    },

    reviewSubmission: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { submissionId, reviewText, score } = req.body;

            // 1. Verify access: Check if the submission belongs to an exam by this instructor
            const [check] = await db.query(
                `SELECT es.id FROM exam_submissions es 
                 JOIN exams e ON es.exam_id = e.id 
                 WHERE es.id = ? AND e.instructor_id = ?`,
                [submissionId, instructorId]
            );

            if (!check.length) return res.status(403).json({ message: 'Access denied' });

            // 2. Insert or Update review
            await db.query(
                `INSERT INTO submission_reviews (submission_id, instructor_id, review_text, score) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE review_text = VALUES(review_text), score = VALUES(score), reviewed_at = CURRENT_TIMESTAMP`,
                [submissionId, instructorId, reviewText, score]
            );

            res.json({ message: 'Review submitted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error reviewing submission' });
        }
    },

    uploadNotes: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { title, subject_id, filePath } = req.body;

            await db.query(
                'INSERT INTO notes (title, file_path, uploaded_by, subject_id) VALUES (?, ?, ?, ?)',
                [title, filePath, instructorId, subject_id]
            );

            const io = req.app.locals.io;
            io.emit('global_sync', { type: 'notes', action: 'upload' });

            res.json({ message: 'Material uploaded successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error uploading notes' });
        }
    },

    updateExam: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { id } = req.params;
            const { title, date, expiry_date, duration, questions, total_marks, type, subject_id, allow_upload, attempts_allowed } = req.body;

            await db.query(
                `UPDATE exams SET title = ?, date = ?, expiry_date = ?, duration = ?, questions = ?, 
                 total_marks = ?, type = ?, subject_id = ?, allow_upload = ?, attempts_allowed = ? 
                 WHERE id = ? AND instructor_id = ?`,
                [title, formatDateForMySQL(date), formatDateForMySQL(expiry_date), duration, JSON.stringify(questions), total_marks, type, subject_id, allow_upload, attempts_allowed || 1, id, instructorId]
            );

            const io = req.app.locals.io;
            io.emit('global_sync', { type: 'exams', action: 'update', id: id });

            res.json({ message: 'Exam updated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error updating exam' });
        }
    },

    deleteExam: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { id } = req.params;

            await db.query('DELETE FROM exams WHERE id = ? AND instructor_id = ?', [id, instructorId]);
            const io = req.app.locals.io;
            io.emit('global_sync', { type: 'exams', action: 'delete', id: id });

            res.json({ message: 'Exam deleted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error deleting exam' });
        }
    },

    getStudentProgress: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const instructorId = req.user.id;
            const { studentId } = req.params;

            // 1. Verify Access (Ensure student is in one of the instructor's batches)
            const [accessCheck] = await db.query(`
                SELECT sb.id 
                FROM student_batches sb
                JOIN batches b ON sb.batch_id = b.id
                WHERE sb.student_id = ? AND b.instructor_id = ?
            `, [studentId, instructorId]);

            if (accessCheck.length === 0) {
                return res.status(403).json({ message: 'Unauthorized: Student is not in your batches.' });
            }

            // 2. Fetch Exam Results
            // We want all exams created by THIS instructor that the student has attempted or missed?
            // For "Progress", usually we show what they have done. Use exam_submissions.

            const [results] = await db.query(`
                SELECT es.id as submission_id, e.title as exam_title, es.score as auto_score, 
                       DATE_FORMAT(es.submitted_at, '%Y-%m-%dT%H:%i:%s.000Z') as submitted_at,
                       sr.score as reviewed_score, sr.review_text,
                       e.total_marks
                FROM exam_submissions es
                JOIN exams e ON es.exam_id = e.id
                LEFT JOIN submission_reviews sr ON es.id = sr.submission_id
                WHERE es.student_id = ? AND e.instructor_id = ?
                ORDER BY es.submitted_at DESC
            `, [studentId, instructorId]);

            res.json(results);

        } catch (err) {
            console.error("Error in getStudentProgress:", err);
            res.status(500).json({ message: 'Server error fetching student progress' });
        }
    },

    // Get instructor's assigned batches with grade and subject information
    getBatches: async (req, res) => {
        const instructorId = req.user.id;
        const db = req.app.locals.db;

        try {
            const [batches] = await db.query(`
                SELECT DISTINCT 
                    b.id as batch_id,
                    b.subject_id,
                    s.name as subject_name,
                    c.name as grade
                FROM batches b
                JOIN subjects s ON b.subject_id = s.id
                JOIN classes c ON s.class_id = c.id
                WHERE b.instructor_id = ?
                ORDER BY c.name, s.name
            `, [instructorId]);

            res.json(batches);
        } catch (err) {
            console.error("Error in getBatches:", err);
            res.status(500).json({ message: 'Server error fetching batches' });
        }
    }
};

module.exports = instructorController;
