module.exports = {
    tableName: 'instructor_subjects',
    createSql: `CREATE TABLE IF NOT EXISTS instructor_subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instructor_id INT NOT NULL,
        subject_id INT NOT NULL,
        assigned_by INT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instructor_id, subject_id),
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT NOT NULL' },
        { name: 'assigned_by', definition: 'INT' },
        { name: 'assigned_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
