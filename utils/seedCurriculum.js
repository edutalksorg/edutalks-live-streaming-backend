const mysql = require('mysql2/promise');
require('dotenv').config();

const curriculum = {
    classes: [
        '6th', '7th', '8th', '9th', '10th',
        '11th',
        '12th'
    ],

    subjects: {
        '6th': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],

        '7th': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],

        '8th': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],

        '9th': [
            'Mathematics',
            'Physical Science',
            'Biological Science',
            'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'NTSE', 'Olympiad', 'IIT/NEET Foundation'
        ],

        '10th': [
            'Mathematics',
            'Physical Science',
            'Biological Science',
            'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'NTSE', 'Olympiad', 'IIT/NEET Foundation',
            'Polytechnic CET'
        ],

        '11th': [
            'Mathematics 1A', 'Mathematics 1B',
            'Physics', 'Chemistry',
            'Botany', 'Zoology',
            'Commerce', 'Economics', 'Civics', 'History',
            'English',
            'JEE Mains', 'NEET', 'TS EAMCET', 'NDA'
        ],

        '12th': [
            'Mathematics 2A', 'Mathematics 2B',
            'Physics', 'Chemistry',
            'Botany', 'Zoology',
            'Commerce', 'Economics', 'Civics', 'History',
            'English',
            'JEE Mains & Advanced', 'NEET',
            'TS EAMCET', 'NDA', 'CUET'
        ]
    }
};

async function seedCurriculum(connection) {
    const [existing] = await connection.query('SELECT id FROM subjects LIMIT 1');
    if (existing.length) return;

    // Insert Classes
    for (const cls of curriculum.classes) {
        await connection.query(
            'INSERT IGNORE INTO classes (name) VALUES (?)',
            [cls]
        );
    }

    // Fetch class IDs
    const [classRows] = await connection.query('SELECT id, name FROM classes');
    const classMap = Object.fromEntries(
        classRows.map(c => [c.name, c.id])
    );

    // Insert Subjects
    for (const [grade, subjects] of Object.entries(curriculum.subjects)) {
        const classId = classMap[grade];
        if (!classId) continue;

        for (const subject of subjects) {
            await connection.query(
                'INSERT IGNORE INTO subjects (name, class_id) VALUES (?, ?)',
                [subject, classId]
            );
        }
    }

    console.log('✅ curriculum seeded successfully');
}

module.exports = { seedCurriculum };
