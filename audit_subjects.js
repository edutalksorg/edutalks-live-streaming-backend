const mysql = require('mysql2/promise');
require('dotenv').config();

async function audit() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'edutalks_db'
    });

    console.log("Auditing Subjects...");

    const [classes] = await connection.query("SELECT * FROM classes");

    for (const cls of classes) {
        const [subjects] = await connection.query("SELECT * FROM subjects WHERE class_id = ?", [cls.id]);
        if (subjects.length > 1) {
            console.log(`\n⚠️  Class "${cls.name}" (ID ${cls.id}) has ${subjects.length} subjects:`);
            subjects.forEach(s => console.log(`   - ID: ${s.id} | Name: "${s.name}"`));
        }
    }

    console.log("\nAudit Complete.");
    await connection.end();
}

audit();
