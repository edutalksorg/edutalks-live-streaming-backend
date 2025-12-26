exports.createTournament = async (req, res) => {
    const { title, description, date, prize, questions, instructor_id, subject_id } = req.body;
    try {
        await req.app.locals.db.query(
            'INSERT INTO exams (title, description, date, type, prize, questions, instructor_id, subject_id) VALUES (?, ?, ?, "tournament", ?, ?, ?, ?)',
            [title, description, date, prize, JSON.stringify(questions), instructor_id, subject_id || null]
        );
        res.status(201).json({ message: 'Tournament created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTournaments = async (req, res) => {
    try {
        const [exams] = await req.app.locals.db.query('SELECT * FROM exams WHERE type = "tournament" ORDER BY date DESC');
        res.json(exams);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentTournaments = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        // 1. Get Student's Grade
        const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [studentId]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found' });
        const grade = users[0].grade;

        // 2. Get Tournaments for that Student's Assigned Instructors
        // We join via student_batches -> batches to ensure the student is actually
        // assigned to the instructor who created the tournament.
        const [tournaments] = await db.query(`
            SELECT DISTINCT e.*, s.name as subject_name
            FROM exams e
            JOIN batches b ON e.instructor_id = b.instructor_id
            JOIN student_batches sb ON b.id = sb.batch_id
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.type = "tournament" AND sb.student_id = ?
            ORDER BY e.date DESC
        `, [studentId]);

        res.json(tournaments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLeaderboard = async (req, res) => {
    // Mock Leaderboard
    const leaderboard = [
        { rank: 1, name: "Student A", score: 98 },
        { rank: 2, name: "Student B", score: 95 },
        { rank: 3, name: "Student C", score: 92 },
    ];
    res.json(leaderboard);
};
