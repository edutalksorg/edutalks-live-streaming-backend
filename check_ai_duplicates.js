const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteDuplicate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'edutalks_db'
    });

    console.log("Deleting Duplicate Subject (ID 677)...");

    // Double check before delete (safety)
    const [check] = await connection.query("SELECT * FROM subjects WHERE id = 677");
    if (check.length > 0) {
        console.log("Found subject to delete:", check[0]);
        await connection.query("DELETE FROM subjects WHERE id = 677");
        console.log("Successfully deleted subject ID 677.");
    } else {
        console.log("Subject ID 677 not found (already deleted?)");
    }

    await connection.end();
}

deleteDuplicate();
