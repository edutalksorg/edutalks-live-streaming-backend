const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function verifyRoles() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [roles] = await connection.execute('SELECT * FROM roles');
        console.log('--- ROLES IN DB ---');
        console.table(roles);
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}

verifyRoles();
