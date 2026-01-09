const mysql = require('mysql2/promise');
require('dotenv').config();

const curriculum = {
    classes: [
        // School Education
        '6th Class', '7th Class', '8th Class', '9th Class', '10th Class',
        '11th Class', '12th Class',

        // Professional Courses (UG/PG)
        'Artificial Intelligence and Machine Learning',
        'Data Science and Analytics',
        'Python Full Stack Development',
        'Java Full Stack Development',
        'Web Development',
        'Cloud Computing and DevOps',
        'Cyber Security and Networking',
        'C Programming',
        'C++ Programming',
        'Data Structures and Algorithms'
    ],

    subjects: {
        // School Education Subjects
        '6th Class': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],
        '7th Class': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],
        '8th Class': [
            'Mathematics', 'Science', 'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'Olympiad Foundation', 'NTSE Foundation'
        ],
        '9th Class': [
            'Mathematics',
            'Physical Science',
            'Biological Science',
            'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'NTSE', 'Olympiad', 'IIT/NEET Foundation'
        ],
        '10th Class': [
            'Mathematics',
            'Physical Science',
            'Biological Science',
            'Social Studies',
            'English', 'Telugu', 'Hindi', 'Sanskrit',
            'NTSE', 'Olympiad', 'IIT/NEET Foundation',
            'Polytechnic CET'
        ],
        '11th Class': [
            'Mathematics 1A', 'Mathematics 1B',
            'Physics', 'Chemistry',
            'Botany', 'Zoology',
            'Commerce', 'Economics', 'Civics', 'History',
            'English',
            'JEE Mains', 'NEET', 'TS EAMCET', 'NDA'
        ],
        '12th Class': [
            'Mathematics 2A', 'Mathematics 2B',
            'Physics', 'Chemistry',
            'Botany', 'Zoology',
            'Commerce', 'Economics', 'Civics', 'History',
            'English',
            'JEE Mains & Advanced', 'NEET',
            'TS EAMCET', 'NDA', 'CUET'
        ],

        // Professional Courses (One Stream = One Subject Mapping)
        'Artificial Intelligence and Machine Learning': ['Artificial Intelligence and Machine Learning'],
        'Data Science and Analytics': ['Data Science and Analytics'],
        'Python Full Stack Development': ['Python Full Stack Development'],
        'Java Full Stack Development': ['Java Full Stack Development'],
        'Web Development': ['Web Development'],
        'Cloud Computing and DevOps': ['Cloud Computing and DevOps'],
        'Cyber Security and Networking': ['Cyber Security and Networking'],
        'C Programming': ['C Programming'],
        'C++ Programming': ['C++ Programming'],
        'Data Structures and Algorithms': ['Data Structures and Algorithms']
    }
};

async function seedCurriculum(connection) {
    // Check removed to ensure subsequent seeds populate missing data
    // const [existing] = await connection.query('SELECT id FROM subjects LIMIT 1');
    // if (existing.length) return;

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
