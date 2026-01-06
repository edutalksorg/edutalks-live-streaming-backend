const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUsers() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'edutalks'
        });

        console.log('--- FIXING USERS TABLE ---');

        // 1. Alter Table
        console.log('Expanding users.grade column...');
        await connection.query('ALTER TABLE users MODIFY COLUMN grade VARCHAR(255)');
        console.log('Column expanded.');

        // 2. Fix Truncated Data (Manual Mapping based on known truncated values)
        const fixes = [
            { truncated: 'Data Science and Ana', full: 'Data Science and Analytics' },
            { truncated: 'Artificial Intellige', full: 'Artificial Intelligence and Machine Learning' },
            { truncated: 'Python Full Stack De', full: 'Python Full Stack Development' },
            { truncated: 'Java Full Stack Deve', full: 'Java Full Stack Development' },
            { truncated: 'Cloud Computing and ', full: 'Cloud Computing and DevOps' },
            { truncated: 'Cyber Security and N', full: 'Cyber Security and Networking' }
        ];

        for (const fix of fixes) {
            const [res] = await connection.query('UPDATE users SET grade = ? WHERE grade LIKE ?', [fix.full, `${fix.truncated}%`]);
            if (res.changedRows > 0) {
                console.log(`Fixed ${res.changedRows} users with grade like "${fix.truncated}..." -> "${fix.full}"`);
            }
        }

        console.log('User data repairs complete.');
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

fixUsers();
