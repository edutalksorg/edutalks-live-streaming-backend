const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

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
        ...courses.map(course => `UG - ${course}`),
        ...courses.map(course => `PG - ${course}`)
    ],
    subjects: {
        '6th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '7th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '8th Class': ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'Olympiad Foundation', 'NTSE Foundation'],
        '9th Class': ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'NTSE', 'Olympiad', 'IIT/NEET Foundation'],
        '10th Class': ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi', 'Sanskrit', 'NTSE', 'Olympiad', 'IIT/NEET Foundation', 'Polytechnic CET'],
        '11th Class': ['Mathematics 1A', 'Mathematics 1B', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Commerce', 'Economics', 'Civics', 'History', 'English', 'JEE Mains', 'NEET', 'TS EAMCET', 'NDA'],
        '12th Class': ['Mathematics 2A', 'Mathematics 2B', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Commerce', 'Economics', 'Civics', 'History', 'English', 'JEE Mains & Advanced', 'NEET', 'TS EAMCET', 'NDA', 'CUET'],
    }
};

courses.forEach(course => {
    curriculum.subjects[`UG - ${course}`] = [course];
    curriculum.subjects[`PG - ${course}`] = [course];
});

async function seedAdmin(connection) {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
        console.log('ℹ️ Super Admin credentials not found in .env. Skipping admin seed.');
        return;
    }

    try {
        // Check if super admin exists
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            console.log('🌱 Seeding Super Admin...');
            const hashedPassword = await bcrypt.hash(password, 10);

            // Fetch or create role
            const [roles] = await connection.query("SELECT id FROM roles WHERE name = 'super_admin'");
            let roleId = 1;
            if (roles.length > 0) {
                roleId = roles[0].id;
            } else {
                const [res] = await connection.query("INSERT INTO roles (name) VALUES ('super_admin')");
                roleId = res.insertId;
            }

            await connection.query(
                'INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
                ['Super Admin', email, hashedPassword, roleId, true]
            );
            console.log('✅ Super Admin created.');
        }
    } catch (error) {
        console.error('❌ Super Admin Seed Failed:', error);
    }
}

async function seedTournamentLevels(connection) {
    try {
        // Check if tournament levels already exist
        const [existing] = await connection.query('SELECT COUNT(*) as count FROM tournament_levels');

        if (existing[0].count > 0) {
            console.log('✅ Tournament levels already seeded.');
            return;
        }

        console.log('🌱 Seeding Tournament Levels...');
        const levels = [
            // Academic Levels
            { name: 'Class 6-8 Foundation', category: 'ACADEMIC', display_order: 1, is_active: true },
            { name: 'Class 9-10', category: 'ACADEMIC', display_order: 2, is_active: true },
            { name: 'Class 11-12', category: 'ACADEMIC', display_order: 3, is_active: true },

            // Competitive Exam Levels
            { name: 'JEE Main', category: 'COMPETITIVE', display_order: 10, is_active: true },
            { name: 'JEE Advanced', category: 'COMPETITIVE', display_order: 11, is_active: true },
            { name: 'NEET', category: 'COMPETITIVE', display_order: 12, is_active: true },
            { name: 'EAMCET', category: 'COMPETITIVE', display_order: 13, is_active: true },
            { name: 'TS EAMCET', category: 'COMPETITIVE', display_order: 14, is_active: true },
            { name: 'AP EAMCET', category: 'COMPETITIVE', display_order: 15, is_active: true },
            { name: 'CUET', category: 'COMPETITIVE', display_order: 16, is_active: true },
            { name: 'SSC CGL', category: 'COMPETITIVE', display_order: 20, is_active: true },
            { name: 'SSC CHSL', category: 'COMPETITIVE', display_order: 21, is_active: true },
            { name: 'SSC MTS', category: 'COMPETITIVE', display_order: 22, is_active: true },
            { name: 'IBPS PO', category: 'COMPETITIVE', display_order: 30, is_active: true },
            { name: 'IBPS Clerk', category: 'COMPETITIVE', display_order: 31, is_active: true },
            { name: 'SBI PO', category: 'COMPETITIVE', display_order: 32, is_active: true },
            { name: 'SBI Clerk', category: 'COMPETITIVE', display_order: 33, is_active: true },
            { name: 'RRB NTPC', category: 'COMPETITIVE', display_order: 34, is_active: true },
            { name: 'Railway Group D', category: 'COMPETITIVE', display_order: 35, is_active: true },
            { name: 'UPSC Prelims', category: 'COMPETITIVE', display_order: 40, is_active: true },
            { name: 'UPSC Mains', category: 'COMPETITIVE', display_order: 41, is_active: true },
            { name: 'State PSC', category: 'COMPETITIVE', display_order: 42, is_active: true },
            { name: 'Telangana State Exams', category: 'COMPETITIVE', display_order: 43, is_active: true },
            { name: 'Andhra Pradesh State Exams', category: 'COMPETITIVE', display_order: 44, is_active: true }
        ];

        for (const level of levels) {
            await connection.query(
                'INSERT INTO tournament_levels (name, category, display_order, is_active) VALUES (?, ?, ?, ?)',
                [level.name, level.category, level.display_order, level.is_active]
            );
        }

        console.log('✅ Tournament levels seeded successfully.');
    } catch (error) {
        console.error('❌ Error seeding tournament levels:', error);
    }
}

async function seed() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'edutalks_db'
        });

        console.log('🌱 Starting Unified Seed...');

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
        for (const [className, subjectsList] of Object.entries(curriculum.subjects)) {
            const classId = classMap[className];
            if (!classId) {
                console.warn(`⚠️ Warning: Class "${className}" not found in DB but has subjects defined.`);
                continue;
            }

            for (const subjectName of subjectsList) {
                await connection.query(
                    'INSERT IGNORE INTO subjects (name, class_id) VALUES (?, ?)',
                    [subjectName, classId]
                );
            }
        }

        // 3. Seed Admin
        await seedAdmin(connection);

        // 4. Seed Tournament Levels
        await seedTournamentLevels(connection);

        console.log('✅ Database Unified Seed Completed Successfully!');

    } catch (err) {
        console.error('❌ Seed Failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
