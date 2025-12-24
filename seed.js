const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function seed() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for seeding.');

        // Check if super admin exists
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            ['superadmin@gmail.com']
        );

        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash('Superadmin123', 10);
            await connection.execute(
                'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = "super_admin"))',
                ['Super Admin', 'superadmin@gmail.com', hashedPassword]
            );
            console.log('Super Admin user created: superadmin@gmail.com / Superadmin123');
        } else {
            console.log('Super Admin already exists.');
        }

        await connection.end();
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

seed();
