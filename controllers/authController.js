
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await req.app.locals.db.query(
            'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check Active Status
        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is pending approval. Please check your email.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role_name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        let assignedClass = null;
        if (user.role_name === 'super_instructor') {
            const [classRecord] = await req.app.locals.db.query(
                'SELECT c.id, c.name FROM class_super_instructors csi JOIN classes c ON csi.class_id = c.id WHERE csi.super_instructor_id = ?',
                [user.id]
            );
            if (classRecord.length > 0) {
                assignedClass = classRecord[0];
            }
        }

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role_name,
                role_id: user.role_id,
                assignedClass
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const BatchAllocationService = require('../services/batchAllocationService');
const emailService = require('../services/emailService');

exports.register = async (req, res) => {
    const { name, email, password, grade, phone, role } = req.body;
    try {
        // Check if user exists
        const [existing] = await req.app.locals.db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine Role
        const roleMap = {
            'student': 'student',
            'instructor': 'instructor',
            'super_instructor': 'super_instructor',
            'admin': 'admin'
        };
        const requestedRole = roleMap[role] || 'student';

        // Get Role ID
        const [roles] = await req.app.locals.db.query('SELECT id FROM roles WHERE name = ?', [requestedRole]);
        if (roles.length === 0) return res.status(400).json({ message: 'Invalid role' });
        const roleId = roles[0].id;

        // Determine Active Status
        const isActive = (requestedRole === 'student');

        const [userResult] = await req.app.locals.db.query(
            'INSERT INTO users (name, email, password, role_id, grade, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, roleId, grade || null, phone, isActive]
        );

        const newUserId = userResult.insertId;

        if (requestedRole === 'student') {
            if (grade) {
                try {
                    const batchService = new BatchAllocationService(req.app.locals.db);
                    await batchService.allocateStudentToBatches(newUserId, grade);
                } catch (batchErr) {
                    console.error("Batch allocation failed:", batchErr);
                }
            }
            res.status(201).json({ message: 'Student registered successfully' });
        } else {
            // Send Email Notifications
            try {
                await emailService.sendRegistrationEmail(email, name, requestedRole);
                await emailService.sendAdminNotification(name, email, requestedRole);
            } catch (emailErr) {
                console.error("Email sending failed:", emailErr);
            }

            res.status(201).json({ message: 'Account request submitted. Waiting for Admin approval.' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};
