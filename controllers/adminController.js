const adminController = {
    getDashboardStats: async (req, res) => {
        // For now, Admin sees similar stats to Super Admin, or we can customize later.
        // Reusing logic for consistency as per previous dashboardController
        try {
            const db = req.app.locals.db;
            const [usersResult] = await db.query('SELECT COUNT(*) as count FROM users');
            const totalUsers = usersResult[0].count;
            const [pendingResult] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = ?', [0]);
            const pendingUsers = pendingResult[0].count;

            res.json({
                totalUsers,
                pendingUsers
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getSuperInstructors: async (req, res) => {
        try {
            const sql = `
                SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.phone, u.grade 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE r.name = 'super_instructor'
            `;
            const [users] = await req.app.locals.db.query(sql);
            res.json(users);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getInstructors: async (req, res) => {
        try {
            const sql = `
                SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.phone, u.grade 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE r.name = 'instructor'
            `;
            const [users] = await req.app.locals.db.query(sql);
            res.json(users);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudents: async (req, res) => {
        try {
            const sql = `
                SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.phone, u.grade 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE r.name = 'student'
            `;
            const [users] = await req.app.locals.db.query(sql);
            res.json(users);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    approveUser: async (req, res) => {
        const { id } = req.params;
        try {
            // Fetch user details for email
            const [users] = await req.app.locals.db.query('SELECT * FROM users WHERE id = ?', [id]);
            if (users.length === 0) return res.status(404).json({ message: 'User not found' });
            const user = users[0];

            await req.app.locals.db.query(
                'UPDATE users SET is_active = 1 WHERE id = ?',
                [id]
            );

            // Fetch role name to check for Super Instructor
            const [roles] = await req.app.locals.db.query('SELECT name FROM roles WHERE id = ?', [user.role_id]);
            const roleName = roles[0]?.name || 'User';

            // Automatic assignment for Super Instructors
            if (roleName === 'super_instructor' && user.grade) {
                try {
                    // Find Class ID
                    const [classes] = await req.app.locals.db.query('SELECT id FROM classes WHERE name = ?', [user.grade]);
                    if (classes.length > 0) {
                        const classId = classes[0].id;
                        await req.app.locals.db.query(
                            'INSERT INTO class_super_instructors (class_id, super_instructor_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE super_instructor_id = VALUES(super_instructor_id)',
                            [classId, user.id]
                        );
                        console.log(`Auto-assigned Super Instructor ${user.name} to class ${user.grade} (ID: ${classId})`);
                    }
                } catch (assignErr) {
                    console.error("Failed to auto-assign Super Instructor to class:", assignErr);
                }
            }

            // Send Approval Email
            try {
                const emailService = require('../services/emailService');
                await emailService.sendApprovalEmail(user.email, user.name, roleName);
            } catch (emailErr) {
                console.error("Failed to send approval email:", emailErr);
            }

            res.json({ message: 'User approved successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deactivateUser: async (req, res) => {
        const { id } = req.params;
        try {
            // Fetch user details
            const [users] = await req.app.locals.db.query('SELECT * FROM users WHERE id = ?', [id]);
            if (users.length === 0) return res.status(404).json({ message: 'User not found' });
            const user = users[0];

            // Deactivate user
            await req.app.locals.db.query(
                'UPDATE users SET is_active = 0 WHERE id = ?',
                [id]
            );

            res.json({ message: 'User deactivated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = adminController;
