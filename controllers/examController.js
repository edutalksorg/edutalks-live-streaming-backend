exports.createExam = async (req, res) => {
    const { title, description, date, duration, total_marks, questions, instructor_id, subject_id, type, allow_upload } = req.body;
    try {
        await req.app.locals.db.query(
            'INSERT INTO exams (title, description, date, duration, total_marks, questions, instructor_id, subject_id, type, allow_upload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, date, duration, total_marks, JSON.stringify(questions), instructor_id, subject_id, type || 'normal', allow_upload || false]
        );
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
        // Auto-grade MCQs if possible, but for now just save.
        // If "submission_data" is JSON string of answers.

        await req.app.locals.db.query(
            'INSERT INTO exam_submissions (exam_id, student_id, submission_data, file_url, status) VALUES (?, ?, ?, ?, ?)',
            [exam_id, student_id, submission_data, file_url, 'pending']
        );

        res.status(201).json({ message: 'Exam submitted successfully' });

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
    const { score } = req.body;
    try {
        await req.app.locals.db.query(
            'UPDATE exam_submissions SET score = ?, status = "graded" WHERE id = ?',
            [score, id]
        );
        res.json({ message: 'Graded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
