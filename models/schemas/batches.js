module.exports = {
    tableName: 'batches',
    createSql: `CREATE TABLE IF NOT EXISTS batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        instructor_id INT NOT NULL,
        name VARCHAR(100),
        student_count INT DEFAULT 0,
        max_students INT DEFAULT 2,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'subject_id', definition: 'INT NOT NULL' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'name', definition: 'VARCHAR(100)' },
        { name: 'student_count', definition: 'INT DEFAULT 0' },
        { name: 'max_students', definition: 'INT DEFAULT 2' },
        { name: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
