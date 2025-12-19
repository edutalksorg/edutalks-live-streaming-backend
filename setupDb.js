const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
};

const schema = `
CREATE DATABASE IF NOT EXISTS physics;
USE physics;

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO roles (name) VALUES 
('super_admin'), ('admin'), ('super_instructor'), ('instructor'), ('student');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    grade VARCHAR(20),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Courses / Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(20) NOT NULL
);

-- Live Classes
CREATE TABLE IF NOT EXISTS live_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    duration INT NOT NULL, -- in minutes
    instructor_id INT NOT NULL,
    subject_id INT,
    status ENUM('scheduled', 'live', 'completed') DEFAULT 'scheduled',
    agora_channel VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Notes / Materials
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    subject_id INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    instructor_id INT NOT NULL,
    subject_id INT,
    start_time DATETIME,
    duration INT, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- default super admin
-- Password will be 'admin123' hashed (I'll handle this in the seeding part or just insert raw for now and let the auth logic handle hashing if I use a script, but actually I should use the proper hashing. 
-- For simplicity in this setup script, I will insert a raw password and assume I'll hash it manually or use a simple check for the initial setup. 
-- BETTER: I'll make a specialized seeder script that uses bcrypt later.
`;

async function setup() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');

        await connection.query(schema);
        console.log('Database and tables created successfully.');

        await connection.end();
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setup();
