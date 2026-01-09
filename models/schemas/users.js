module.exports = {
    tableName: 'users',
    createSql: `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        grade VARCHAR(100),
        phone VARCHAR(15),
        is_active BOOLEAN DEFAULT TRUE,
        subscription_expires_at DATETIME,
        plan_name VARCHAR(50) DEFAULT 'Free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(100) NOT NULL' },
        { name: 'email', definition: 'VARCHAR(100) NOT NULL UNIQUE' },
        { name: 'password', definition: 'VARCHAR(255) NOT NULL' },
        { name: 'role_id', definition: 'INT NOT NULL' },
        { name: 'grade', definition: 'VARCHAR(100)' },
        { name: 'phone', definition: 'VARCHAR(15)' },
        { name: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
        { name: 'subscription_expires_at', definition: 'DATETIME' },
        { name: 'plan_name', definition: "VARCHAR(50) DEFAULT 'Free'" },
        { name: 'created_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'reset_token', definition: 'VARCHAR(255)' },
        { name: 'reset_token_expires', definition: 'DATETIME' },
        { name: 'selected_subject_id', definition: 'INT NULL' }
    ]
};
