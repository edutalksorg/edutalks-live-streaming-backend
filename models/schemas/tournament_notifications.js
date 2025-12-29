module.exports = {
    tableName: 'tournament_notifications',
    createSql: `CREATE TABLE IF NOT EXISTS tournament_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tournament_id INT NOT NULL,
        student_id INT NOT NULL,
        notification_type ENUM('ANNOUNCEMENT', 'REMINDER_24H', 'REMINDER_1H', 'EXAM_START', 'EXAM_10MIN', 'RESULT_PUBLISHED') NOT NULL,
        
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        
        in_app_sent BOOLEAN DEFAULT FALSE,
        email_sent BOOLEAN DEFAULT FALSE,
        push_sent BOOLEAN DEFAULT FALSE,
        
        scheduled_at TIMESTAMP NOT NULL,
        sent_at TIMESTAMP NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_scheduled (scheduled_at, in_app_sent, email_sent),
        INDEX idx_tournament (tournament_id),
        INDEX idx_student (student_id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'tournament_id', definition: 'INT NOT NULL' },
        { name: 'student_id', definition: 'INT NOT NULL' },
        { name: 'notification_type', definition: "ENUM('ANNOUNCEMENT', 'REMINDER_24H', 'REMINDER_1H', 'EXAM_START', 'EXAM_10MIN', 'RESULT_PUBLISHED') NOT NULL" },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'message', definition: 'TEXT NOT NULL' },
        { name: 'in_app_sent', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'email_sent', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'push_sent', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'scheduled_at', definition: 'TIMESTAMP NOT NULL' },
        { name: 'sent_at', definition: 'TIMESTAMP NULL' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
