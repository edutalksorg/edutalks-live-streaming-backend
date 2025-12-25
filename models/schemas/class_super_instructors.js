module.exports = {
    tableName: 'class_super_instructors',
    createSql: `CREATE TABLE IF NOT EXISTS class_super_instructors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        super_instructor_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (super_instructor_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'class_id', definition: 'INT NOT NULL' },
        { name: 'super_instructor_id', definition: 'INT NOT NULL' },
        { name: 'assigned_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
