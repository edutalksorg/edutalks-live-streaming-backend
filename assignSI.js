const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function assignClass() {
    try {
        const pool = mysql.createPool(dbConfig);
        console.log('Connected to MySQL.');

        // 1. Get Super Instructor ID (assuming specific email or just first one)
        // We set up 'superinstructor@edutalks.com' in previous steps or manual usage? 
        // Let's create one if not exists or find one.

        const email = 'superinstructor@edutalks.com';
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

        let siId;
        if (users.length === 0) {
            // Create
            const [roles] = await pool.query('SELECT id FROM roles WHERE name = "super_instructor"');
            const roleId = roles[0].id;
            const bcrypt = require('bcryptjs');
            const hashed = await bcrypt.hash('Password123', 10);

            const [res] = await pool.query('INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
                ['Super Inst', email, hashed, roleId]);
            siId = res.insertId;
            console.log('Created Super Instructor:', email);
        } else {
            siId = users[0].id;
            console.log('Found Super Instructor:', email);
        }

        // 2. Get 10th Class ID
        const [classes] = await pool.query('SELECT id FROM classes WHERE name = "10th"');
        if (classes.length === 0) {
            console.log('Class 10th not found, seeding...');
            await pool.query('INSERT INTO classes (name) VALUES ("10th")');
            // Re-fetch
            const [c] = await pool.query('SELECT id FROM classes WHERE name = "10th"');
            classId = c[0].id;
        } else {
            classId = classes[0].id;
        }

        // 3. Assign
        try {
            await pool.query('INSERT INTO class_super_instructors (class_id, super_instructor_id) VALUES (?, ?)', [classId, siId]);
            console.log(`Assigned Super Instructor ${siId} to Class ${classId}`);
        } catch (e) {
            console.log('Assignment might already exist or failed:', e.message);
        }

        await pool.end();
    } catch (error) {
        console.error('Script Failed:', error);
    }
}

assignClass();
