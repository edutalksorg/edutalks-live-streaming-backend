const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspectPrasanna() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'edutalks'
        });

        console.log('--- INSPECTING PRASANNA ---');
        const [users] = await connection.query('SELECT id, name, email, grade, selected_subject_id FROM users WHERE name LIKE "%prasanna%"');
        console.table(users);

        // Also check if text matches subject
        if (users.length > 0) {
            const u = users[0];
            console.log(`Checking Subject Match for grade: "${u.grade}"`);
            const [subjects] = await connection.query('SELECT * FROM subjects WHERE name = ?', [u.grade]);
            if (subjects.length > 0) {
                console.log('✅ Exact Subject Found:', subjects[0]);
            } else {
                console.log('❌ No Exact Subject Found.');
                const [fuzzy] = await connection.query('SELECT * FROM subjects WHERE name LIKE ?', [`%${u.grade}%`]);
                console.log('Fuzzy Matches:', fuzzy);
            }
        }

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

inspectPrasanna();
