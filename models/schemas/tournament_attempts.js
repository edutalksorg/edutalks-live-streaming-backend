module.exports = {
    tableName: 'tournament_attempts',
    createSql: `CREATE TABLE IF NOT EXISTS tournament_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tournament_id INT NOT NULL,
        student_id INT NOT NULL,
        
        started_at TIMESTAMP NULL,
        submitted_at TIMESTAMP NULL,
        time_taken INT COMMENT 'Time taken in seconds',
        
        answers JSON,
        score INT DEFAULT 0,
        total_marks INT,
        accuracy DECIMAL(5,2) COMMENT 'Accuracy percentage',
        
        ranking INT,
        
        tab_switches INT DEFAULT 0,
        activity_log JSON COMMENT 'Array of activity events',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_attempt (tournament_id, student_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_ranking (tournament_id, score DESC, time_taken ASC),
        INDEX idx_tournament (tournament_id),
        INDEX idx_student (student_id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'tournament_id', definition: 'INT NOT NULL' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'started_at', definition: 'TIMESTAMP NULL' },
        { name: 'submitted_at', definition: 'TIMESTAMP NULL' },
        { name: 'time_taken', definition: 'INT' },
        { name: 'answers', definition: 'JSON' },
        { name: 'score', definition: 'INT DEFAULT 0' },
        { name: 'total_marks', definition: 'INT' },
        { name: 'accuracy', definition: 'DECIMAL(5,2)' },
        { name: 'ranking', definition: 'INT' },
        { name: 'tab_switches', definition: 'INT DEFAULT 0' },
        { name: 'activity_log', definition: 'JSON' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
