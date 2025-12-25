module.exports = {
    tableName: 'live_class_attendance',
    createSql: `CREATE TABLE IF NOT EXISTS live_class_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL,
        FOREIGN KEY (class_id) REFERENCES live_classes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'class_id', definition: 'INT NOT NULL' },
        { name: 'user_id', definition: 'INT NOT NULL' },
        { name: 'joined_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'left_at', definition: 'TIMESTAMP NULL' }
    ]
};
