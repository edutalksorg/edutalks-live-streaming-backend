const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function fix() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to Database.');

        // 1. Ensure table exists (in case setupDb hasn't run yet)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS instructor_subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instructor_id INT NOT NULL,
                subject_id INT NOT NULL,
                assigned_by INT,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(instructor_id, subject_id),
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id)
            )
        `);

        // 2. Populate from existing batches
        const [batches] = await connection.query('SELECT instructor_id, subject_id FROM batches');
        console.log(`Found ${batches.length} existing batches. Syncing to instructor_subjects...`);

        for (const batch of batches) {
            await connection.query(
                'INSERT IGNORE INTO instructor_subjects (instructor_id, subject_id) VALUES (?, ?)',
                [batch.instructor_id, batch.subject_id]
            );
        }

        console.log('Population complete.');

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fix();
