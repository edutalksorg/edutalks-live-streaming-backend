module.exports = {
    tableName: 'tournaments',
    createSql: `CREATE TABLE IF NOT EXISTS tournaments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        level_id INT,
        subject_id INT,
        instructor_id INT NOT NULL,
        
        registration_start DATETIME NOT NULL,
        registration_end DATETIME NOT NULL,
        
        exam_start DATETIME NOT NULL,
        exam_end DATETIME NOT NULL,
        
        duration INT NOT NULL COMMENT 'Duration in minutes',
        total_questions INT NOT NULL,
        total_marks INT DEFAULT 100,
        max_participants INT DEFAULT NULL,
        
        questions JSON NOT NULL,
        
        status ENUM('DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'RESULT_PUBLISHED') DEFAULT 'DRAFT',
        is_free BOOLEAN DEFAULT TRUE,
        prize VARCHAR(255),
        
        tab_switch_limit INT DEFAULT 3,
        screenshot_block BOOLEAN DEFAULT FALSE,
        
        grade VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
        FOREIGN KEY (level_id) REFERENCES tournament_levels(id),
        
        INDEX idx_instructor (instructor_id),
        INDEX idx_status (status),
        INDEX idx_exam_dates (exam_start, exam_end)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'description', definition: 'TEXT' },
        { name: 'level_id', definition: 'INT' },
        { name: 'subject_id', definition: 'INT' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'registration_start', definition: 'DATETIME NOT NULL' },
        { name: 'registration_end', definition: 'DATETIME NOT NULL' },
        { name: 'exam_start', definition: 'DATETIME NOT NULL' },
        { name: 'exam_end', definition: 'DATETIME NOT NULL' },
        { name: 'duration', definition: 'INT NOT NULL' },
        { name: 'total_questions', definition: 'INT NOT NULL' },
        { name: 'total_marks', definition: 'INT DEFAULT 100' },
        { name: 'max_participants', definition: 'INT DEFAULT NULL' },
        { name: 'questions', definition: 'JSON NOT NULL' },
        { name: 'status', definition: "ENUM('DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'RESULT_PUBLISHED') DEFAULT 'DRAFT'" },
        { name: 'is_free', definition: 'BOOLEAN DEFAULT TRUE' },
        { name: 'prize', definition: 'VARCHAR(255)' },
        { name: 'tab_switch_limit', definition: 'INT DEFAULT 3' },
        { name: 'screenshot_block', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'grade', definition: 'VARCHAR(50) NOT NULL' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]
};
