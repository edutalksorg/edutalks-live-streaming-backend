require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function addCols() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query("ALTER TABLE exams ADD COLUMN type VARCHAR(50) DEFAULT 'exam'");
        await connection.query("ALTER TABLE exams ADD COLUMN prize VARCHAR(255) DEFAULT NULL");
        console.log("Columns added successfully");
        await connection.end();
    } catch (err) {
        console.error("Error or column already exists:", err.message);
    }
}

addCols();
