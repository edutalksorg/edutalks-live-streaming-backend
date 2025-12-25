module.exports = {
    tableName: 'exam_submissions',
    createSql: `CREATE TABLE IF NOT EXISTS exam_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT NOT NULL,
        student_id INT NOT NULL,
        submission_data JSON,
        file_path VARCHAR(255) NULL,
        score INT DEFAULT NULL,
        status ENUM('pending', 'graded') DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'exam_id', definition: 'INT NOT NULL' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'submission_data', definition: 'JSON' },
        { name: 'file_path', definition: 'VARCHAR(255) NULL' },
        { name: 'score', definition: 'INT DEFAULT NULL' },
        { name: 'status', definition: "ENUM('pending', 'graded') DEFAULT 'pending'" },
        { name: 'submitted_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
