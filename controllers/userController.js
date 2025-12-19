const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await req.app.locals.db.query(`
            SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.is_active, u.created_at 
            FROM users u 
            JOIN roles r ON u.role_id = r.id
        `);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;
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

        await req.app.locals.db.query(
            'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, roleId]
        );

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const emailService = require('../services/emailService');

exports.toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body; // boolean

    try {
        await req.app.locals.db.query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active, id]
        );

        // Send Email if activated
        if (is_active) {
            try {
                // Fetch User Email
                const [users] = await req.app.locals.db.query('SELECT email, name FROM users WHERE id = ?', [id]);
                if (users.length > 0) {
                    await emailService.sendApprovalEmail(users[0].email, users[0].name);
                }
            } catch (emailErr) {
                console.error("Failed to send approval email:", emailErr);
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
