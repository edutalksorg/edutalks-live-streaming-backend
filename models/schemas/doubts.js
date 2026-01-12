module.exports = {
    tableName: 'doubts',
    createSql: `CREATE TABLE IF NOT EXISTS doubts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        instructor_id INT NOT NULL,
        subject_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        status ENUM('pending', 'resolved') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT NOT NULL' },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'status', definition: "ENUM('pending', 'resolved') DEFAULT 'pending'" },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]
};
