module.exports = {
    tableName: 'tournament_levels',
    createSql: `CREATE TABLE IF NOT EXISTS tournament_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category ENUM('ACADEMIC', 'COMPETITIVE') NOT NULL,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(100) NOT NULL' },
        { name: 'category', definition: "ENUM('ACADEMIC', 'COMPETITIVE') NOT NULL" },
        { name: 'display_order', definition: 'INT DEFAULT 0' },
        { name: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ],
    seedData: [
        // Academic Levels
        { name: 'Class 6-8 Foundation', category: 'ACADEMIC', display_order: 1, is_active: true },
        { name: 'Class 9-10', category: 'ACADEMIC', display_order: 2, is_active: true },
        { name: 'Class 11-12', category: 'ACADEMIC', display_order: 3, is_active: true },

        // Competitive Exam Levels
        { name: 'JEE Main', category: 'COMPETITIVE', display_order: 10, is_active: true },
        { name: 'JEE Advanced', category: 'COMPETITIVE', display_order: 11, is_active: true },
        { name: 'NEET', category: 'COMPETITIVE', display_order: 12, is_active: true },
        { name: 'EAMCET', category: 'COMPETITIVE', display_order: 13, is_active: true },
        { name: 'TS EAMCET', category: 'COMPETITIVE', display_order: 14, is_active: true },
        { name: 'AP EAMCET', category: 'COMPETITIVE', display_order: 15, is_active: true },
        { name: 'CUET', category: 'COMPETITIVE', display_order: 16, is_active: true },
        { name: 'SSC CGL', category: 'COMPETITIVE', display_order: 20, is_active: true },
        { name: 'SSC CHSL', category: 'COMPETITIVE', display_order: 21, is_active: true },
        { name: 'SSC MTS', category: 'COMPETITIVE', display_order: 22, is_active: true },
        { name: 'IBPS PO', category: 'COMPETITIVE', display_order: 30, is_active: true },
        { name: 'IBPS Clerk', category: 'COMPETITIVE', display_order: 31, is_active: true },
        { name: 'SBI PO', category: 'COMPETITIVE', display_order: 32, is_active: true },
        { name: 'SBI Clerk', category: 'COMPETITIVE', display_order: 33, is_active: true },
        { name: 'RRB NTPC', category: 'COMPETITIVE', display_order: 34, is_active: true },
        { name: 'Railway Group D', category: 'COMPETITIVE', display_order: 35, is_active: true },
        { name: 'UPSC Prelims', category: 'COMPETITIVE', display_order: 40, is_active: true },
        { name: 'UPSC Mains', category: 'COMPETITIVE', display_order: 41, is_active: true },
        { name: 'State PSC', category: 'COMPETITIVE', display_order: 42, is_active: true },
        { name: 'Telangana State Exams', category: 'COMPETITIVE', display_order: 43, is_active: true },
        { name: 'Andhra Pradesh State Exams', category: 'COMPETITIVE', display_order: 44, is_active: true }
    ]
};
