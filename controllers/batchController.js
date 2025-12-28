exports.getAllBatches = async (req, res) => {
    try {
        const db = req.app.locals.db;
        let query = `
            SELECT b.*, s.name as subject_name, c.name as class_name, u.name as instructor_name, u.email as instructor_email 
            FROM batches b 
            JOIN subjects s ON b.subject_id = s.id 
            JOIN classes c ON s.class_id = c.id 
            LEFT JOIN users u ON b.instructor_id = u.id 
        `;
        let params = [];

        // Security filtering for Super Instructor
        if (req.user.role === 'super_instructor') {
            const [siClass] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [req.user.id]);
            if (siClass.length > 0) {
                query += ` WHERE c.id = ?`;
                params.push(siClass[0].class_id);
            } else {
                return res.json([]); // No class assigned
            }
        }

        query += ` ORDER BY c.name, s.name`;

        const [batches] = await db.query(query, params);

        // Fetch students for these batches
        if (batches.length > 0) {
            const batchIds = batches.map(b => b.id);
            const [students] = await db.query(`
                SELECT sb.batch_id, u.id, u.name, u.plan_name 
                FROM student_batches sb 
                JOIN users u ON sb.student_id = u.id 
                WHERE sb.batch_id IN (?)
            `, [batchIds]);

            // Map students to batches
            batches.forEach(batch => {
                batch.students = students.filter(s => s.batch_id === batch.id);
            });
        }

        res.json(batches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateBatchInstructor = async (req, res) => {
    const { id } = req.params;
    const { instructor_id } = req.body;
    const db = req.app.locals.db;

    try {
        // Security check for Super Instructor
        if (req.user.role === 'super_instructor') {
            // Get SI's Class
            const [siClass] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [req.user.id]);
            if (siClass.length === 0) return res.status(403).json({ message: "No class assigned." });
            const siClassId = siClass[0].class_id;

            // Verify Batch's Class matches SI's Class
            // We join batches -> subjects -> classes to check class_id
            const [batchCheck] = await db.query(`
                SELECT c.id as class_id 
                FROM batches b 
                JOIN subjects s ON b.subject_id = s.id
                JOIN classes c ON s.class_id = c.id
                WHERE b.id = ?
            `, [id]);

            if (batchCheck.length === 0) return res.status(404).json({ message: "Batch not found" });

            if (batchCheck[0].class_id !== siClassId) {
                return res.status(403).json({ message: "Access denied. Batch belongs to another grade." });
            }
        }

        await db.query(
            'UPDATE batches SET instructor_id = ? WHERE id = ?',
            [instructor_id, id]
        );
        res.json({ message: 'Batch instructor updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
