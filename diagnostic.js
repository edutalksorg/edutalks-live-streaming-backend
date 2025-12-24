const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("--- USERS ---");
        const [users] = await connection.execute("SELECT u.id, u.name, r.name as role FROM users u JOIN roles r ON u.role_id = r.id");
        console.table(users);

        console.log("--- BATCHES ---");
        const [batches] = await connection.execute(`
            SELECT b.id, b.name, b.instructor_id, u.name as instr, b.subject_id, s.name as sub
            FROM batches b
            JOIN users u ON b.instructor_id = u.id
            JOIN subjects s ON b.subject_id = s.id
        `);
        console.table(batches);

        console.log("--- STUDENT 2 ASSIGNMENTS ---");
        const [sb] = await connection.execute(`
            SELECT sb.student_id, u.name as student, b.instructor_id, ui.name as instr, s.name as subject
            FROM student_batches sb
            JOIN users u ON sb.student_id = u.id
            JOIN batches b ON sb.batch_id = b.id
            JOIN users ui ON b.instructor_id = ui.id
            JOIN subjects s ON b.subject_id = s.id
            WHERE sb.student_id = 2
        `);
        console.table(sb);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
