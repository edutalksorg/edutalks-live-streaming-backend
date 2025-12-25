module.exports = {
    tableName: 'payments',
    createSql: `CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        payment_id VARCHAR(50),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'user_id', definition: 'INT NOT NULL' },
        { name: 'order_id', definition: 'VARCHAR(50) NOT NULL' },
        { name: 'payment_id', definition: 'VARCHAR(50)' },
        { name: 'amount', definition: 'DECIMAL(10, 2) NOT NULL' },
        { name: 'currency', definition: "VARCHAR(10) DEFAULT 'INR'" },
        { name: 'status', definition: "ENUM('pending', 'completed', 'failed') DEFAULT 'pending'" },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
