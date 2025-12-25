module.exports = {
    tableName: 'submission_reviews',
    createSql: `CREATE TABLE IF NOT EXISTS submission_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        instructor_id INT NOT NULL,
        review_text TEXT,
        score INT,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES exam_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'submission_id', definition: 'INT NOT NULL' },
        { name: 'instructor_id', definition: 'INT NOT NULL' },
        { name: 'review_text', definition: 'TEXT' },
        { name: 'score', definition: 'INT' },
        { name: 'reviewed_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
};
