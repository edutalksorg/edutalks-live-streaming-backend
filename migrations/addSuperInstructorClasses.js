const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function addSuperInstructorClasses() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Create super_instructor_classes table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS super_instructor_classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time DATETIME NOT NULL,
                duration INT NOT NULL,
                super_instructor_id INT NOT NULL,
                subject_id INT,
                grade VARCHAR(20) NOT NULL,
                status ENUM('scheduled', 'live', 'completed') DEFAULT 'scheduled',
                agora_channel VARCHAR(255),
                reminder_sent BOOLEAN DEFAULT FALSE,
                chat_locked BOOLEAN DEFAULT FALSE,
                audio_locked BOOLEAN DEFAULT FALSE,
                video_locked BOOLEAN DEFAULT FALSE,
                screen_share_allowed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (super_instructor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id)
            )
        `;

        await connection.query(createTableSQL);
        console.log('✓ super_instructor_classes table created successfully');

        // Create attendance table for super instructor classes
        const createAttendanceSQL = `
            CREATE TABLE IF NOT EXISTS super_instructor_class_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP NULL,
                FOREIGN KEY (class_id) REFERENCES super_instructor_classes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await connection.query(createAttendanceSQL);
        console.log('✓ super_instructor_class_attendance table created successfully');

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error in migration:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = { addSuperInstructorClasses };

if (require.main === module) {
    addSuperInstructorClasses()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
