const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
};

async function setup() {
    let connection;
    try {
        // 1. Create Database if strictly needed (usually handled, but good to have)
        connection = await mysql.createConnection(dbConfig);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log('Connected to Database.');

        // 2. Define Tables (Create if not exists - using LATEST schemas)
        const tables = [
            `CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            )`,
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role_id INT NOT NULL,
                grade VARCHAR(20),
                phone VARCHAR(15),
                is_active BOOLEAN DEFAULT TRUE,
                subscription_expires_at DATETIME,
                plan_name VARCHAR(50) DEFAULT 'Free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles(id)
            )`,
            // Classes (needed for subjects)
            `CREATE TABLE IF NOT EXISTS classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(20) NOT NULL UNIQUE
            )`,
            // Subjects (Updated schema with class_id)
            `CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                class_id INT,
                grade VARCHAR(20), -- Keeping for backward compatibility if needed
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS live_classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time DATETIME NOT NULL,
                duration INT NOT NULL,
                instructor_id INT NOT NULL,
                subject_id INT,
                status ENUM('scheduled', 'live', 'completed') DEFAULT 'scheduled',
                agora_channel VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (instructor_id) REFERENCES users(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id)
            )`,
            `CREATE TABLE IF NOT EXISTS exams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                instructor_id INT NOT NULL,
                subject_id INT,
                date DATETIME, -- Using 'date' as per controller/frontend
                expiry_date DATETIME,
                duration INT,
                questions JSON,
                total_marks INT DEFAULT 100,
                type VARCHAR(50) DEFAULT 'exam',
                prize VARCHAR(255) DEFAULT NULL,
                allow_upload BOOLEAN DEFAULT FALSE,
                attempts_allowed INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (instructor_id) REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                order_id VARCHAR(50) NOT NULL,
                payment_id VARCHAR(50),
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'INR',
                status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            // Advanced Tables
            `CREATE TABLE IF NOT EXISTS class_super_instructors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                super_instructor_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(class_id),
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (super_instructor_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS batches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                instructor_id INT NOT NULL,
                name VARCHAR(100),
                student_count INT DEFAULT 0,
                max_students INT DEFAULT 2,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS student_batches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                batch_id INT NOT NULL,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, batch_id),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS exam_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                exam_id INT NOT NULL,
                student_id INT NOT NULL,
                submission_data JSON,
                file_path VARCHAR(255) NULL,
                score INT DEFAULT NULL,
                status ENUM('pending', 'graded') DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS submission_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                submission_id INT NOT NULL,
                instructor_id INT NOT NULL,
                review_text TEXT,
                score INT,
                reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (submission_id) REFERENCES exam_submissions(id) ON DELETE CASCADE,
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_path VARCHAR(255) NOT NULL,
                uploaded_by INT NOT NULL,
                subject_id INT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS instructor_subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instructor_id INT NOT NULL,
                subject_id INT NOT NULL,
                assigned_by INT,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(instructor_id, subject_id),
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id)
            )`
        ];

        for (const sql of tables) {
            await connection.query(sql);
        }
        console.log('Tables verified/created.');

        // 3. Migrations (Add columns if missing)
        // We run these in try/catch blocks ignoring 'Duplicate column name' errors
        const migrations = [
            "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE exams ADD COLUMN questions JSON",
            "ALTER TABLE exams ADD COLUMN total_marks INT DEFAULT 100",
            "ALTER TABLE exams ADD COLUMN type VARCHAR(50) DEFAULT 'exam'",
            "ALTER TABLE exams ADD COLUMN prize VARCHAR(255) DEFAULT NULL",
            "ALTER TABLE subjects ADD COLUMN class_id INT",
            "ALTER TABLE batches MODIFY max_students INT DEFAULT 2",
            "UPDATE batches SET max_students = 2",
            "ALTER TABLE users ADD COLUMN subscription_expires_at DATETIME",
            "ALTER TABLE users ADD COLUMN plan_name VARCHAR(50) DEFAULT 'Free'",
            "ALTER TABLE notes ADD COLUMN description TEXT",
            "ALTER TABLE exams ADD COLUMN date DATETIME",
            "ALTER TABLE exams ADD COLUMN description TEXT",
            "ALTER TABLE exams ADD COLUMN allow_upload BOOLEAN DEFAULT FALSE",
            "ALTER TABLE exams ADD COLUMN expiry_date DATETIME",
            "ALTER TABLE exam_submissions ADD COLUMN submission_data JSON",
            "ALTER TABLE exam_submissions ADD COLUMN file_path VARCHAR(255) NULL",
            "ALTER TABLE exam_submissions ADD COLUMN score INT DEFAULT NULL",
            "ALTER TABLE exam_submissions ADD COLUMN status ENUM('pending', 'graded') DEFAULT 'pending'",
            "ALTER TABLE exam_submissions MODIFY COLUMN file_path VARCHAR(255) NULL",
            "ALTER TABLE exams ADD COLUMN attempts_allowed INT DEFAULT 1",
        ];

        for (const sql of migrations) {
            try {
                await connection.query(sql);
            } catch (err) {
                // Ignore duplicate column errors or duplicate key errors
                if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME') {
                    // console.warn(`Migration info (${sql}):`, err.message);
                }
            }
        }
        console.log('Schema migrations applied.');

        // 4. Seed Static Data (Roles, Classes) if needed
        const seeds = [
            "INSERT IGNORE INTO roles (name) VALUES ('super_admin'), ('admin'), ('super_instructor'), ('instructor'), ('student')",
            "INSERT IGNORE INTO classes (name) VALUES ('6th'), ('7th'), ('8th'), ('9th'), ('10th'), ('11th'), ('12th')"
        ];

        for (const sql of seeds) {
            await connection.query(sql);
        }

        console.log('Database initialization complete.');

        // 5. Seed Comprehensive Curriculum
        const { seedCurriculum } = require('./seedCurriculum');
        await seedCurriculum(connection);

    } catch (error) {
        console.error('Error in database setup:', error);
        throw error; // Propagate error to crash server if DB fails
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = { setup };

if (require.main === module) {
    setup();
}
