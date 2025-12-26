exports.createExam = async (req, res) => {
    const { title, description, date, duration, total_marks, questions, instructor_id, subject_id, type, allow_upload } = req.body;
    try {
        await req.app.locals.db.query(
            'INSERT INTO exams (title, description, date, duration, total_marks, questions, instructor_id, subject_id, type, allow_upload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, date, duration, total_marks, JSON.stringify(questions), instructor_id, subject_id, type || 'normal', allow_upload || false]
        );
        // Emit global sync event
        const io = req.app.locals.io;
        if (io) {
            io.emit('global_sync', { type: 'exams', action: 'create' });
        }

        res.status(201).json({ message: 'Exam created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getExams = async (req, res) => {
    try {
        const [exams] = await req.app.locals.db.query('SELECT * FROM exams ORDER BY date DESC');
        res.json(exams);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentExams = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        // 1. Get Exams for the Student's Batch(es)
        // Since there is one instructor per batch and one batch per student (usually),
        // we join through student_batches -> batches to find the exams.
        const [exams] = await db.query(`
            SELECT 
                e.*, 
                s.name as subject_name,
                MAX(es.score) as achieved_score,
                (SELECT id FROM exam_submissions WHERE exam_id = e.id AND student_id = ? ORDER BY submitted_at DESC LIMIT 1) as submission_id,
                (SELECT status FROM exam_submissions WHERE exam_id = e.id AND student_id = ? ORDER BY submitted_at DESC LIMIT 1) as submission_status,
                (SELECT COUNT(*) FROM exam_submissions WHERE exam_id = e.id AND student_id = ?) as attempt_count
            FROM exams e
            JOIN batches b ON e.instructor_id = b.instructor_id AND e.subject_id = b.subject_id
            JOIN student_batches sb ON b.id = sb.batch_id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN exam_submissions es ON e.id = es.exam_id AND es.student_id = ?
            WHERE sb.student_id = ?
            GROUP BY e.id
            ORDER BY e.date DESC
        `, [studentId, studentId, studentId, studentId, studentId]);

        res.json(exams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getExamById = async (req, res) => {
    const { id } = req.params;
    try {
        const [exams] = await req.app.locals.db.query('SELECT * FROM exams WHERE id = ?', [id]);
        if (exams.length === 0) return res.status(404).json({ message: 'Exam not found' });
        res.json(exams[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.submitExam = async (req, res) => {
    const { exam_id, student_id, submission_data } = req.body;
    let file_url = null;
    if (req.file) {
        file_url = `/uploads/exams/${req.file.filename}`;
    }

    try {
        const db = req.app.locals.db;

        // 1. Fetch Exam details
        const [exams] = await db.query('SELECT questions, total_marks, attempts_allowed, expiry_date FROM exams WHERE id = ?', [exam_id]);
        if (exams.length === 0) return res.status(404).json({ message: 'Exam not found' });

        const exam = exams[0];

        // 2. Check Expiry
        if (exam.expiry_date && new Date() > new Date(exam.expiry_date)) {
            return res.status(403).json({ message: 'This exam has expired' });
        }

        // 3. Check Attempt Limit
        const [submissions] = await db.query('SELECT COUNT(*) as count FROM exam_submissions WHERE exam_id = ? AND student_id = ?', [exam_id, student_id]);
        if (submissions[0].count >= (exam.attempts_allowed || 1)) {
            return res.status(403).json({ message: 'You have reached the maximum number of attempts allowed for this exam' });
        }
        const questions = typeof exam.questions === 'string' ? JSON.parse(exam.questions) : exam.questions;
        const studentAnswers = typeof submission_data === 'string' ? JSON.parse(submission_data) : submission_data;

        let autoScore = 0;
        let hasPhotoQuestion = false;

        questions.forEach((q, index) => {
            const studentAns = studentAnswers[index];
            if (q.type === 'mcq') {
                if (studentAns !== undefined && studentAns === q.correctOption) {
                    autoScore += 1; // 1 mark per question
                }
            } else if (q.type === 'fib') {
                if (studentAns !== undefined && q.correctAnswer && studentAns.toString().trim().toLowerCase() === q.correctAnswer.toString().trim().toLowerCase()) {
                    autoScore += 1; // 1 mark per question
                }
            } else if (q.type === 'photo') {
                hasPhotoQuestion = true;
            }
        });

        const status = hasPhotoQuestion ? 'pending' : 'graded';
        const submissionDataString = typeof submission_data === 'string' ? submission_data : JSON.stringify(submission_data);

        const [result] = await db.query(
            'INSERT INTO exam_submissions (exam_id, student_id, submission_data, file_path, score, status) VALUES (?, ?, ?, ?, ?, ?)',
            [exam_id, student_id, submissionDataString, file_url, autoScore, status]
        );

        res.status(201).json({
            message: 'Exam submitted successfully',
            submissionId: result.insertId,
            score: autoScore,
            status: status
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getExamSubmissions = async (req, res) => {
    const { id } = req.params; // Exam ID
    try {
        const [submissions] = await req.app.locals.db.query(`
            SELECT es.*, u.name as student_name 
            FROM exam_submissions es
            JOIN users u ON es.student_id = u.id
            WHERE es.exam_id = ?
        `, [id]);
        res.json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.gradeSubmission = async (req, res) => {
    const { id } = req.params; // Submission ID
    const { score, review_text } = req.body;
    try {
        await req.app.locals.db.query(
            'UPDATE exam_submissions SET score = ?, review_text = ?, status = "graded" WHERE id = ?',
            [score, review_text, id]
        );
        res.json({ message: 'Graded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSubmissionResult = async (req, res) => {
    const { id } = req.params; // Submission ID
    try {
        const [submissions] = await req.app.locals.db.query(`
            SELECT es.*, e.title, e.questions, e.total_marks, e.type
            FROM exam_submissions es
            JOIN exams e ON es.exam_id = e.id
            WHERE es.id = ?
        `, [id]);

        if (submissions.length === 0) return res.status(404).json({ message: 'Submission not found' });

        const submission = submissions[0];
        const exam = {
            title: submission.title,
            questions: submission.questions,
            total_marks: submission.total_marks,
            type: submission.type
        };

        // Remove sensitive info from submission before sending to student if needed
        // but here we just send what's needed for the result view.

        res.json({ submission, exam });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadWorksheet = async (req, res) => {
    const { id } = req.params; // Submission ID
    const studentId = req.user.id;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/exams/${req.file.filename}`;

    try {
        const db = req.app.locals.db;

        // Verify ownership
        const [submissions] = await db.query('SELECT id FROM exam_submissions WHERE id = ? AND student_id = ?', [id, studentId]);
        if (submissions.length === 0) {
            return res.status(403).json({ message: 'Unauthorized / Submission not found' });
        }

        await db.query('UPDATE exam_submissions SET file_path = ? WHERE id = ?', [fileUrl, id]);

        res.json({ message: 'Worksheet uploaded successfully', fileUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error uploading worksheet' });
    }
};
