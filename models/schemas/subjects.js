module.exports = {
    tableName: 'subjects',
    createSql: `CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        class_id INT,
        grade VARCHAR(20),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(100) NOT NULL' },
        { name: 'class_id', definition: 'INT' },
        { name: 'grade', definition: 'VARCHAR(20)' }
    ]
};
