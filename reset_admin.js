const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function resetPassword() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');

        const email = 'superadmin@edutalks.com';
        const newPassword = 'Superadmin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log(`Password for ${email} has been updated to: ${newPassword}`);
        } else {
            console.log(`User ${email} not found. Creating user...`);
            // Optional: Create if not exists, but mostly checking for update
            const [roles] = await connection.execute('SELECT id FROM roles WHERE name = "super_admin"');
            if (roles.length > 0) {
                await connection.execute(
                    'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
                    ['Super Admin', email, hashedPassword, roles[0].id]
                );
                console.log(`Created new Super Admin: ${email} / ${newPassword}`);
            } else {
                console.error('Role "super_admin" not found. Cannot create user.');
            }
        }

        await connection.end();
    } catch (error) {
        console.error('Error updating password:', error);
    }
}

resetPassword();
