const mysql = require('mysql2/promise');

const courses = [
    'Python Full Stack Development',
    'Java Full Stack Development',
    'Web Development',
    'Data Science and Analytics',
    'Artificial Intelligence and Machine Learning',
    'Cloud Computing and DevOps',
    'Cyber Security and Networking',
    'C Programming',
    'C++ Programming',
    'Data Structures and Algorithms'
];

const curriculum = {
    classes: [
        '6th Class', '7th Class', '8th Class', '9th Class', '10th Class',
        '11th Class', '12th Class',
        // UG Professional Courses as Classes
        ...courses.map(course => `UG - ${course}`),
        // PG Professional Courses as Classes
        ...courses.map(course => `PG - ${course}`)
    ],
    subjectsMapping: {
        '6th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '7th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '8th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '9th Class': ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'NTSE', 'Olympiad', 'IIT/NEET Foundation'],
        '10th Class': ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'NTSE', 'Olympiad', 'IIT/NEET Foundation', 'Polytechnic CET'],
        '11th Class': ['Mathematics 1A', 'Mathematics 1B', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Commerce', 'Economics', 'Civics', 'History', 'English', 'JEE Mains', 'NEET', 'TS EAMCET', 'NDA'],
        '12th Class': ['Mathematics 2A', 'Mathematics 2B', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Commerce', 'Economics', 'Civics', 'History', 'English', 'JEE Mains & Advanced', 'NEET', 'TS EAMCET', 'NDA', 'CUET'],
    }
};

// Add 1:1 subjects for UG and PG classes
courses.forEach(course => {
    curriculum.subjectsMapping[`UG - ${course}`] = [course];
    curriculum.subjectsMapping[`PG - ${course}`] = [course];
});

async function seedCurriculum(connection) {
    try {
        console.log('🌱 Seeding Refined Curriculum (1:1 UG/PG Mapping)...');

        // 1. Seed Classes
        console.log('...Seeding Classes');
        for (const clsName of curriculum.classes) {
            await connection.query(
                'INSERT IGNORE INTO classes (name) VALUES (?)',
                [clsName]
            );
        }

        // Get Class Map (Name -> ID)
        const [classRows] = await connection.query('SELECT id, name FROM classes');
        const classMap = {};
        classRows.forEach(row => { classMap[row.name] = row.id; });

        // 2. Seed Subjects
        console.log('...Seeding Subjects');
        for (const [className, subjectsList] of Object.entries(curriculum.subjectsMapping)) {
            const classId = classMap[className];
            if (!classId) {
                console.warn(`⚠️ Warning: Class "${className}" not found in DB but has subjects defined.`);
                continue;
            }

            for (const subjectName of subjectsList) {
                // For UG/PG, we also store the full grade name in the 'grade' column of 'subjects' 
                // to help with legacy queries if any.
                const isProfessional = className.startsWith('UG -') || className.startsWith('PG -');

                await connection.query(
                    'INSERT IGNORE INTO subjects (name, class_id, grade) VALUES (?, ?, ?)',
                    [subjectName, classId, className]
                );
            }
        }

        console.log('✅ Refined Curriculum seeded successfully.');
    } catch (error) {
        console.error('❌ Error seeding curriculum:', error);
        throw error;
    }
}

module.exports = { seedCurriculum };
