const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function updateSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Add 'type' and 'allow_upload' to 'exams' table if not exists
        try {
            await connection.query(`
                ALTER TABLE exams 
                ADD COLUMN type ENUM('normal', 'olympiad') DEFAULT 'normal',
                ADD COLUMN allow_upload BOOLEAN DEFAULT FALSE;
            `);
            console.log("Added 'type' and 'allow_upload' to exams table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("Columns already exist in exams table.");
            } else {
                console.error("Error altering exams table:", err);
            }
        }

        // 2. Create 'exam_submissions' table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS exam_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                exam_id INT,
                student_id INT,
                submission_data JSON,
                file_url VARCHAR(255),
                score INT DEFAULT NULL,
                status ENUM('pending', 'graded') DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("Created/Verified 'exam_submissions' table.");

        connection.end();
    } catch (err) {
        console.error('Schema update failed:', err);
    }
}

updateSchema();
