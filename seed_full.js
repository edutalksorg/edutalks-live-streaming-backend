const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function seedFull() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for FULL seeding.');

        // Helpers
        const hash = async (pwd) => await bcrypt.hash(pwd, 10);
        const getRoleId = async (name) => {
            const [rows] = await connection.execute('SELECT id FROM roles WHERE name = ?', [name]);
            return rows[0].id;
        };

        const roles = {
            super_admin: await getRoleId('super_admin'),
            admin: await getRoleId('admin'),
            super_instructor: await getRoleId('super_instructor'),
            instructor: await getRoleId('instructor'),
            student: await getRoleId('student')
        };

        // 1. Create Users
        console.log('Creating Users...');

        // Super Admin
        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
            ['Super Admin Ref', 'superadmin@edutalks.com', await hash('Password123'), roles.super_admin]);

        // Admin
        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
            ['Admin User', 'admin@edutalks.com', await hash('Password123'), roles.admin]);

        // Super Instructor
        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
            ['Super Instructor One', 'si@edutalks.com', await hash('Password123'), roles.super_instructor]);

        // Instructors
        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
            ['Physics Teacher', 'phy@edutalks.com', await hash('Password123'), roles.instructor, true]);

        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
            ['Math Teacher', 'math@edutalks.com', await hash('Password123'), roles.instructor, true]);

        // Students
        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id, grade, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            ['Student John', 'john@edutalks.com', await hash('Password123'), roles.student, '10th', true]);

        await connection.execute('INSERT IGNORE INTO users (name, email, password, role_id, grade, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            ['Student Jane', 'jane@edutalks.com', await hash('Password123'), roles.student, '12th', true]);


        // Get IDs
        const [users] = await connection.execute('SELECT id, email FROM users');
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.email]: u.id }), {});

        // 2. Setup Data
        console.log('Setting up Classes/Subjects/Batches...');

        // Ensure Class 10th exists
        let classId;
        const [classes] = await connection.execute('SELECT id FROM classes WHERE name = "10th Grade"');
        if (classes.length === 0) {
            const [res] = await connection.execute('INSERT INTO classes (name) VALUES ("10th Grade")');
            classId = res.insertId;
        } else {
            classId = classes[0].id;
        }

        // Assign Super Instructor to Class
        await connection.execute('INSERT IGNORE INTO class_super_instructors (class_id, super_instructor_id) VALUES (?, ?)',
            [classId, userMap['si@edutalks.com']]);

        // Subjects
        let subjectId;
        const [subjects] = await connection.execute('SELECT id FROM subjects WHERE name = "Physics" AND class_id = ?', [classId]);
        if (subjects.length === 0) {
            const [res] = await connection.execute('INSERT INTO subjects (name, class_id) VALUES ("Physics", ?)', [classId]);
            subjectId = res.insertId;
        } else {
            subjectId = subjects[0].id;
        }

        // Batch Assignment
        // Assign Physics Teacher to the first batch of Physics
        // Assuming Batch logic: Check if batch exists, else create.
        // For simplicity, let's just create a manual batch entry if needed, or rely on auto-allocation logic.
        // Let's manually create a batch to ensure the instructor sees it.
        await connection.execute('INSERT INTO batches (name, subject_id, instructor_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE instructor_id = ?',
            ['Physics Batch A', subjectId, userMap['phy@edutalks.com'], userMap['phy@edutalks.com']]
        );

        // 3. Create Exam
        console.log('Creating Exams...');
        const questions = [
            { text: 'What is the unit of Force?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correctOption: 0 },
            { text: 'E=mc^2 is related to?', options: ['Newton', 'Einstein', 'Bohr', 'Rutherford'], correctOption: 1 }
        ];

        await connection.execute(`
            INSERT INTO exams (title, date, duration, total_marks, questions, instructor_id, subject_id, type, allow_upload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['Physics Term 1', new Date(), 60, 20, JSON.stringify(questions), userMap['phy@edutalks.com'], subjectId, 'normal', true]);

        const [examRes] = await connection.execute('SELECT id FROM exams WHERE title = "Physics Term 1" LIMIT 1');
        const examId = examRes[0].id;

        // 4. Create Submission
        console.log('Creating Submissions...');
        const studentId = userMap['john@edutalks.com'];
        const submissionData = { 0: 0, 1: 1 }; // Correct answers

        await connection.execute(`
            INSERT INTO exam_submissions (exam_id, student_id, submission_data, status)
            VALUES (?, ?, ?, ?)
        `, [examId, studentId, JSON.stringify(submissionData), 'pending']);

        console.log('------------------------------------------------');
        console.log('SEEDING COMPLETE. Use the following credentials:');
        console.log('Super Admin:      superadmin@edutalks.com / Password123');
        console.log('Admin:            admin@edutalks.com / Password123');
        console.log('Super Instructor: si@edutalks.com / Password123 (Class: 10th Grade)');
        console.log('Instructor:       phy@edutalks.com / Password123 (Subject: Physics)');
        console.log('Student:          john@edutalks.com / Password123 (Grade: 10th)');
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('Seed execution failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

seedFull();
