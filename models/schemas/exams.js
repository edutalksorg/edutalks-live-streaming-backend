module.exports = {
    tableName: 'exams',
    createSql: `CREATE TABLE IF NOT EXISTS exams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructor_id INT NOT NULL,
        subject_id INT,
        date DATETIME,
        expiry_date DATETIME,
        duration INT,
        questions JSON,
        total_marks INT DEFAULT 100,
        type VARCHAR(50) DEFAULT 'exam',
        prize VARCHAR(255) DEFAULT NULL,
        allow_upload BOOLEAN DEFAULT FALSE,
        attempts_allowed INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'description', definition: 'TEXT' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT' },
        { name: 'date', definition: 'DATETIME' },
        { name: 'expiry_date', definition: 'DATETIME' },
        { name: 'duration', definition: 'INT' },
        { name: 'questions', definition: 'JSON' },
        { name: 'total_marks', definition: 'INT DEFAULT 100' },
        { name: 'type', definition: "VARCHAR(50) DEFAULT 'exam'" },
        { name: 'prize', definition: "VARCHAR(255) DEFAULT NULL" },
        { name: 'allow_upload', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'attempts_allowed', definition: 'INT DEFAULT 1' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
