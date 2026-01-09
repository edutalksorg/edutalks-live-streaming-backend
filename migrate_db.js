
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Starting Migration ---');

        console.log('Migrating users.grade...');
        await connection.query('ALTER TABLE users MODIFY COLUMN grade VARCHAR(100)');

        console.log('Migrating subjects.grade...');
        await connection.query('ALTER TABLE subjects MODIFY COLUMN grade VARCHAR(100)');

        console.log('Migrating classes.name...');
        await connection.query('ALTER TABLE classes MODIFY COLUMN name VARCHAR(100)');

        console.log('✅ Migration completed successfully');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
