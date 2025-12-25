module.exports = {
    tableName: 'student_batches',
    createSql: `CREATE TABLE IF NOT EXISTS student_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        batch_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, batch_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'batch_id', definition: 'INT NOT NULL' },
        { name: 'enrolled_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
