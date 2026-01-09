const mysql = require('mysql2/promise');
require('dotenv').config();

async function aggressiveCleanup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'edutalks_db'
    });

    console.log("Starting Aggressive Subject Cleanup...");

    const [classes] = await connection.query("SELECT * FROM classes");
    let totalDeleted = 0;

    for (const cls of classes) {
        const [subjects] = await connection.query("SELECT * FROM subjects WHERE class_id = ? ORDER BY id ASC", [cls.id]);

        if (subjects.length > 1) {
            // Keep the first one (oldest), delete the rest
            const keep = subjects[0];
            const remove = subjects.slice(1);
            const removeIds = remove.map(s => s.id);

            console.log(`Class "${cls.name}" (ID ${cls.id}): Keeping ID ${keep.id}, Deleting IDs [${removeIds.join(', ')}]`);

            await connection.query("DELETE FROM subjects WHERE id IN (?)", [removeIds]);
            totalDeleted += removeIds.length;
        }
    }

    console.log(`\nCleanup Complete. Total duplicate subjects deleted: ${totalDeleted}`);
    await connection.end();
}

aggressiveCleanup();
