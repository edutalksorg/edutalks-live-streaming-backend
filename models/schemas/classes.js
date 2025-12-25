module.exports = {
    tableName: 'classes',
    createSql: `CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(20) NOT NULL UNIQUE
    )`,
    columns: [
        { name: 'id', definition: 'INT AUTO_INCREMENT PRIMARY KEY' },
        { name: 'name', definition: 'VARCHAR(20) NOT NULL UNIQUE' }
    ]
};
