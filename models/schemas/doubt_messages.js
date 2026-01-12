module.exports = {
    tableName: 'doubt_messages',
    createSql: `CREATE TABLE IF NOT EXISTS doubt_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doubt_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT,
        message_type ENUM('text', 'image', 'audio') DEFAULT 'text',
        file_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'doubt_id', definition: 'INT NOT NULL' },
        { name: 'sender_id', definition: 'INT NOT NULL' },
        { name: 'message', definition: 'TEXT' },
        { name: 'message_type', definition: "ENUM('text', 'image', 'audio') DEFAULT 'text'" },
        { name: 'file_url', definition: 'VARCHAR(255)' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
