const { v4: uuidv4 } = require('uuid');

exports.createClass = async (req, res) => {
    const { title, description, start_time, duration, instructor_id, subject_id } = req.body;

    // Generate unique channel name for Agora
    const agora_channel = `class_${instructor_id}_${Date.now()}`;

    try {
        await req.app.locals.db.query(
            'INSERT INTO live_classes (title, description, start_time, duration, instructor_id, subject_id, agora_channel) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, start_time, duration, instructor_id, subject_id || null, agora_channel]
        );
        res.status(201).json({ message: 'Class scheduled successfully', agora_channel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstructorClasses = async (req, res) => {
    const { instructorId } = req.params;
    try {
        const [classes] = await req.app.locals.db.query(
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
