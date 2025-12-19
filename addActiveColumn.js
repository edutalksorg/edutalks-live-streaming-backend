const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function migrate() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');

        // Add is_active column if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            `);
            console.log("Added 'is_active' column to users table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("'is_active' column already exists.");
            } else {
                console.error("Error adding column:", err);
            }
        }

        await connection.end();
    } catch (error) {
        console.error('Error in migration:', error);
    }
}

migrate();
