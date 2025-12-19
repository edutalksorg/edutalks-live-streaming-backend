exports.createTournament = async (req, res) => {
    const { title, description, date, prize, questions, instructor_id } = req.body;
    try {
        await req.app.locals.db.query(
            'INSERT INTO exams (title, description, date, type, prize, questions, instructor_id) VALUES (?, ?, ?, "tournament", ?, ?, ?)',
            [title, description, date, prize, JSON.stringify(questions), instructor_id]
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

exports.getLeaderboard = async (req, res) => {
    // Mock Leaderboard
    const leaderboard = [
        { rank: 1, name: "Student A", score: 98 },
        { rank: 2, name: "Student B", score: 95 },
        { rank: 3, name: "Student C", score: 92 },
    ];
    res.json(leaderboard);
};
