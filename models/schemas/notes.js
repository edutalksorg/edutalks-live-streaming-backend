module.exports = {
    tableName: 'notes',
    createSql: `CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(255) NOT NULL,
        uploaded_by INT NOT NULL,
        subject_id INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'description', definition: 'TEXT' },
        { name: 'file_path', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'uploaded_by', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT' },
        { name: 'uploaded_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
