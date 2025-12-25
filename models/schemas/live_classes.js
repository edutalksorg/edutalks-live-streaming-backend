module.exports = {
    tableName: 'live_classes',
    createSql: `CREATE TABLE IF NOT EXISTS live_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        duration INT NOT NULL,
        instructor_id INT NOT NULL,
        subject_id INT,
        status ENUM('scheduled', 'live', 'completed') DEFAULT 'scheduled',
        agora_channel VARCHAR(255),
        reminder_sent BOOLEAN DEFAULT FALSE,
        chat_locked BOOLEAN DEFAULT FALSE,
        audio_locked BOOLEAN DEFAULT FALSE,
        video_locked BOOLEAN DEFAULT FALSE,
        screen_share_allowed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'title', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'description', definition: 'TEXT' },
        { name: 'start_time', definition: 'DATETIME NOT NULL' },
        { name: 'duration', definition: 'INT NOT NULL' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'subject_id', definition: 'INT' },
        { name: 'status', definition: "ENUM('scheduled', 'live', 'completed') DEFAULT 'scheduled'" },
        { name: 'agora_channel', definition: 'VARCHAR(255)' },
        { name: 'reminder_sent', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'chat_locked', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'audio_locked', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'video_locked', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'screen_share_allowed', definition: 'BOOLEAN DEFAULT FALSE' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
