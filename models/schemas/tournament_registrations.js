module.exports = {
    tableName: 'tournament_registrations',
    createSql: `CREATE TABLE IF NOT EXISTS tournament_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tournament_id INT NOT NULL,
        student_id INT NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_id VARCHAR(255),
        
        UNIQUE KEY unique_registration (tournament_id, student_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_tournament (tournament_id),
        INDEX idx_student (student_id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'tournament_id', definition: 'INT NOT NULL' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'registered_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'payment_id', definition: 'VARCHAR(255)' }
    ]
};
