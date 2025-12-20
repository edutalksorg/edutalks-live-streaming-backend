const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const curriculum = {
    classes: [
        '6th', '7th', '8th', '9th', '10th',
        '11th (Inter 1st Year)', '12th (Inter 2nd Year)'
    ],
    subjects: {
        '6th': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
        '7th': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
        '8th': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
        '9th': [
            'Mathematics (State)', 'Mathematics (Central)',
            'Physical Science (State)', 'Biology (State)', 'Science (Central)',
            'Social Studies', 'English', 'Telugu', 'Hindi'
        ],
        '10th': [
            'Mathematics (State)', 'Mathematics (Central)',
            'Physical Science (State)', 'Biology (State)', 'Science (Central)',
            'Social Studies', 'English', 'Telugu', 'Hindi'
        ],
        '11th (Inter 1st Year)': [
            'Mathematics 1A', 'Mathematics 1B', 'Physics', 'Chemistry', // MPC
            'Botany', 'Zoology', // BiPC
            'Commerce', 'Economics', 'Civics', // CEC/MEC
            'English', 'Sanskrit/Telugu/Hindi'
        ],
        '12th (Inter 2nd Year)': [
            'Mathematics 2A', 'Mathematics 2B', 'Physics', 'Chemistry',
            'Botany', 'Zoology',
            'Commerce', 'Economics', 'Civics',
            'English', 'Sanskrit/Telugu/Hindi'
        ]
    },
    competitive: [
        { name: 'JEE Mains & Advanced', grades: ['11th (Inter 1st Year)', '12th (Inter 2nd Year)'] },
        { name: 'NEET', grades: ['11th (Inter 1st Year)', '12th (Inter 2nd Year)'] },
        { name: 'EAMCET (TS & AP)', grades: ['11th (Inter 1st Year)', '12th (Inter 2nd Year)'] },
        { name: 'NDA Exam', grades: ['11th (Inter 1st Year)', '12th (Inter 2nd Year)'] }
    ]
};

async function seedCurriculum(connection) {
    try {
        // Check if curriculum already exists
        const [subjects] = await connection.query('SELECT id FROM subjects LIMIT 1');
        if (subjects.length > 0) {
            console.log('Curriculum already exists. Skipping seeding.');
            return;
        }

        console.log('Seeding Curriculum...');

        // 1. Seed Classes
        for (const className of curriculum.classes) {
            await connection.query('INSERT IGNORE INTO classes (name) VALUES (?)', [className]);
        }

        // 2. Fetch Class IDs
        const [classRows] = await connection.query('SELECT id, name FROM classes');
        const classMap = {};
        classRows.forEach(row => classMap[row.name] = row.id);

        // 3. Seed Subjects
        for (const [grade, subjects] of Object.entries(curriculum.subjects)) {
            const classId = classMap[grade];
            if (!classId) continue;

            for (const subjectName of subjects) {
                await connection.query(
                    'INSERT IGNORE INTO subjects (name, class_id) VALUES (?, ?)',
                    [subjectName, classId]
                );
            }
        }

        // 4. Seed Competitive Exams
        for (const exam of curriculum.competitive) {
            for (const grade of exam.grades) {
                const classId = classMap[grade];
                if (classId) {
                    await connection.query(
                        'INSERT IGNORE INTO subjects (name, class_id) VALUES (?, ?)',
                        [exam.name, classId]
                    );
                }
            }
        }

        console.log('Curriculum seeded checked.');

    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

module.exports = { seedCurriculum };
