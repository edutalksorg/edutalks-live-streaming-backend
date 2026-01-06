const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugHub() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'edutalks'
        });

        console.log('--- DEBUGGING STUDENT HUB ---');

        // 1. Get User Data for 'Vijay' (assuming name or explicit check)
        // Searching by name 'Vijay' or just listing last created user
        const [users] = await connection.query('SELECT id, name, email, role_id, grade, selected_subject_id, is_active FROM users ORDER BY id DESC LIMIT 5');
        console.log('--- Recent Users ---');
        console.table(users);

        // Pick the user 'vijay' if found, else the latest
        const student = users.find(u => u.name.toLowerCase().includes('vijay')) || users[0];
        console.log(`\nAnalyzing Student: ${student.name} (Grade: "${student.grade}")`);

        // 2. Simulating getSubjectsFull Query Logic
        const grade = student.grade;
        const cleanGrade = grade ? grade.replace(/[^a-zA-Z0-9\s]/g, '').trim() : '';
        console.log(`Cleaned Grade: "${cleanGrade}"`);

        console.log('\n--- Checking Subjects Match ---');

        // Match 1: By Class ID (Standard)
        const [byClass] = await connection.query(`
            SELECT s.id, s.name, c.name as class_name 
            FROM subjects s 
            JOIN classes c ON s.class_id = c.id 
            WHERE c.name = ?
        `, [grade]);
        console.log('Match by Exact Class Name:', byClass.length > 0 ? byClass : 'NONE');

        // Match 2: Fuzzy / LIKE
        if (cleanGrade) {
            const [byFuzzy] = await connection.query(`
                SELECT s.id, s.name 
                FROM subjects s 
                WHERE s.name LIKE ?
            `, [`%${cleanGrade}%`]);
            console.log('Match by Subject Name LIKE:', byFuzzy.length > 0 ? byFuzzy : 'NONE');
        }

        // Match 3: The actual complex query from controller
        // Note: I'll simplify the subqueries for debug visibility
        // s.grade = ? OR s.class_id = (SELECT id FROM classes WHERE name = ? OR name LIKE ?) OR s.grade LIKE ?

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

debugHub();
