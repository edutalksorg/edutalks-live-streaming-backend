const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const schema = `
    CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        payment_id VARCHAR(50),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`;

async function addPaymentSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL. Adding Payments Table...');
        await connection.query(schema);
        console.log('Payments table created.');
        await connection.end();
    } catch (error) {
        console.error('Error adding payment schema:', error);
    }
}

addPaymentSchema();
