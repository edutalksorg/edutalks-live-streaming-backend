const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
};

const schemaUpdates = `
    SET FOREIGN_KEY_CHECKS = 0;

    -- Drop tables to ensure clean schema with correct FKs
    DROP TABLE IF EXISTS student_batches;
    DROP TABLE IF EXISTS submission_reviews;
    DROP TABLE IF EXISTS exam_submissions;
    DROP TABLE IF EXISTS batches;
    DROP TABLE IF EXISTS class_super_instructors;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS classes;
    
    -- Recreate Classes
    CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(20) NOT NULL UNIQUE
    );

    -- Recreate Subjects with proper FK
    CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        class_id INT NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    -- Super Instructor Allocation
    CREATE TABLE IF NOT EXISTS class_super_instructors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        super_instructor_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (super_instructor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Batches
    CREATE TABLE IF NOT EXISTS batches (
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
    );

    -- Student Batch Enrollment
    CREATE TABLE IF NOT EXISTS student_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        batch_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, batch_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    -- Test/Exam Submissions
    CREATE TABLE IF NOT EXISTS exam_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT NOT NULL,
        student_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Instructor Reviews
    CREATE TABLE IF NOT EXISTS submission_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        instructor_id INT NOT NULL,
        review_text TEXT,
        score INT,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES exam_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    SET FOREIGN_KEY_CHECKS = 1;
`;

const seedData = `
    -- Seed Classes
    INSERT IGNORE INTO classes (name) VALUES 
    ('6th'), ('7th'), ('8th'), ('9th'), ('10th'), ('11th'), ('12th');

    -- Seed Subjects for 10th (Example)
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Mathematics', id FROM classes WHERE name = '10th';
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Physics', id FROM classes WHERE name = '10th';
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Chemistry', id FROM classes WHERE name = '10th';
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Biology', id FROM classes WHERE name = '10th';
    
    -- Seed Subjects for 12th (Example)
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Mathematics', id FROM classes WHERE name = '12th';
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Physics', id FROM classes WHERE name = '12th';
    INSERT IGNORE INTO subjects (name, class_id) SELECT 'Chemistry', id FROM classes WHERE name = '12th';
`;

async function updateSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL. Updating Schema...');

        await connection.query(schemaUpdates);
        console.log('Tables recreated successfully.');

        await connection.query(seedData);
        console.log('Seed data injected.');

        await connection.end();
    } catch (error) {
        console.error('Error updating schema:', error);
    }
}

updateSchema();
