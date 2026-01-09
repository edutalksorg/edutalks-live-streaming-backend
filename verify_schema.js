
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkFinalSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [users] = await connection.query('DESCRIBE users');
        const gradeCol = users.find(c => c.Field === 'grade');
        console.log(`users.grade: ${gradeCol.Type}`);

        const [subjects] = await connection.query('DESCRIBE subjects');
        const subGradeCol = subjects.find(c => c.Field === 'grade');
        console.log(`subjects.grade: ${subGradeCol.Type}`);

        const [classes] = await connection.query('DESCRIBE classes');
        const classNameCol = classes.find(c => c.Field === 'name');
        console.log(`classes.name: ${classNameCol.Type}`);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkFinalSchema();
