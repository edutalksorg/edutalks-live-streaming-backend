const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        let sql = `
            SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.is_active, u.created_at, u.phone, u.grade, s.name as course_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN subjects s ON u.selected_subject_id = s.id
        `;
        const params = [];

        // Filter for regular 'admin': can only see instructors and students
        if (req.user && req.user.role === 'admin') {
            sql += ` WHERE r.name IN ('super_instructor', 'instructor', 'student')`;
        }

        const [users] = await req.app.locals.db.query(sql, params);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, role, grade, phone } = req.body;
    // role: 'admin', 'super_instructor', 'instructor'

    try {
        // Check if exists
        const [existing] = await req.app.locals.db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Get Role ID
        const [roles] = await req.app.locals.db.query('SELECT id FROM roles WHERE name = ?', [role]);
        if (roles.length === 0) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const roleId = roles[0].id;

        const hashedPassword = await bcrypt.hash(password, 10);

        // Auto-resolve selected_subject_id for UG/PG granular classes
        let resolvedSubjectId = null;
        if (role === 'student' && grade && (grade.startsWith('UG -') || grade.startsWith('PG -'))) {
            const [subjectRows] = await req.app.locals.db.query('SELECT id FROM subjects WHERE grade = ? LIMIT 1', [grade]);
            if (subjectRows.length > 0) {
                resolvedSubjectId = subjectRows[0].id;
            }
        }

        await req.app.locals.db.query(
            'INSERT INTO users (name, email, password, role_id, grade, phone, selected_subject_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, roleId, grade || null, phone || null, resolvedSubjectId]
        );

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// const emailService = require('../services/emailService'); // Not modifying this line as I can't see the context above clearly in this block, but I'll leave the requirement to remove usage.

exports.toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body; // boolean

    try {
        await req.app.locals.db.query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active, id]
        );

        // Automatic assignment for Super Instructors when activated
        if (is_active) {
            try {
                const [users] = await req.app.locals.db.query(
                    'SELECT u.id, u.name, u.grade, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
                    [id]
                );

                if (users.length > 0) {
                    const user = users[0];
                    if (user.role_name === 'super_instructor' && user.grade) {
                        const [classes] = await req.app.locals.db.query('SELECT id FROM classes WHERE name = ?', [user.grade]);
                        if (classes.length > 0) {
                            const classId = classes[0].id;
                            await req.app.locals.db.query(
                                'INSERT INTO class_super_instructors (class_id, super_instructor_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE super_instructor_id = VALUES(super_instructor_id)',
                                [classId, user.id]
                            );
                            console.log(`Auto-assigned Super Instructor ${user.name} to class ${user.grade} (ID: ${classId}) during status toggle.`);
                        }
                    }
                }
            } catch (assignErr) {
                console.error("Failed to auto-assign Super Instructor during status toggle:", assignErr);
            }
        }

        res.json({ message: 'User status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await req.app.locals.db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
