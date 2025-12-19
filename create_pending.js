const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createPendingUser() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to MySQL.');

        // 1. Get Instructor Role ID
        const [roles] = await connection.execute('SELECT id FROM roles WHERE name = "instructor"');
        if (roles.length === 0) {
            console.error('Role "instructor" not found!');
            process.exit(1);
        }
        const roleId = roles[0].id;

        // 2. Create Pending User
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [result] = await connection.execute(
            'INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
            ['Pending Instructor', 'pending@test.com', hashedPassword, roleId, 0] // is_active = 0
        );

        console.log(`Created pending user with ID: ${result.insertId}`);
        await connection.end();
    } catch (error) {
        console.error('Error creating user:', error);
    }
}

createPendingUser();
