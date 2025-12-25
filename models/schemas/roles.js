module.exports = {
    tableName: 'roles',
    createSql: `CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(50) NOT NULL UNIQUE' }
    ]
};
