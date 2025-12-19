exports.getAllBatches = async (req, res) => {
    try {
        const [batches] = await req.app.locals.db.query(`
            SELECT b.*, s.name as subject_name, c.name as class_name, u.name as instructor_name, u.email as instructor_email 
            FROM batches b 
            JOIN subjects s ON b.subject_id = s.id 
            JOIN classes c ON s.class_id = c.id 
            LEFT JOIN users u ON b.instructor_id = u.id 
            ORDER BY c.name, s.name
        `);
        res.json(batches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateBatchInstructor = async (req, res) => {
    const { id } = req.params;
    const { instructor_id } = req.body;

    try {
        await req.app.locals.db.query(
            'UPDATE batches SET instructor_id = ? WHERE id = ?',
            [instructor_id, id]
        );
        res.json({ message: 'Batch instructor updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
