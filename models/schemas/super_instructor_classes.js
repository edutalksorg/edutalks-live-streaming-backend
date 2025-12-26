module.exports = {
    tableName: 'super_instructor_classes',
    createSql: `
        CREATE TABLE IF NOT EXISTS super_instructor_classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            super_instructor_id INT NOT NULL,
            subject_id INT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NULL,
            duration INT DEFAULT 60,
            grade VARCHAR(50) NOT NULL,
            agora_channel VARCHAR(255),
            status VARCHAR(50) DEFAULT 'scheduled',
            meeting_link VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (super_instructor_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `,
    columns: [
        { name: 'super_instructor_id', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT NULL' },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'description', definition: 'TEXT' },
        { name: 'start_time', definition: 'DATETIME NOT NULL' },
        { name: 'end_time', definition: 'DATETIME NULL' },
        { name: 'duration', definition: 'INT DEFAULT 60' },
        { name: 'grade', definition: 'VARCHAR(50) NOT NULL' },
        { name: 'agora_channel', definition: 'VARCHAR(255)' },
        { name: 'status', definition: 'VARCHAR(50) DEFAULT "scheduled"' },
        { name: 'meeting_link', definition: 'VARCHAR(255)' },
        { name: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
