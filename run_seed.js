const mysql = require('mysql2/promise');
require('dotenv').config();
const { seedCurriculum } = require('./utils/seedCurriculum');

async function runSeed() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'edutalks'
        });

        console.log('Running Seed...');
        await seedCurriculum(connection);
        console.log('Seed completed.');

        await connection.end();
    } catch (err) {
        console.error('Seed Failed:', err);
    }
}

runSeed();
