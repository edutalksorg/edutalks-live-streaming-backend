const mysql = require('mysql2/promise');
const BatchAllocationService = require('./services/batchAllocationService');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function testBatchAllocation() {
    try {
        const pool = mysql.createPool(dbConfig);
        console.log('Connected to MySQL.');

        const batchService = new BatchAllocationService(pool);

        // Simulating a student ID (assuming ID 999 doesn't exist or doesn't matter for this unit test if foreign keys allow, 
        // but we need a real ID for FK constraints usually. 
        // Let's create a dummy user first to be safe.

        const [roles] = await pool.query('SELECT id FROM roles WHERE name = "student"');
        const roleId = roles[0].id;

        // Create dummy student
        const email = `teststudent${Date.now()}@test.com`;
        const [res] = await pool.query(
            'INSERT INTO users (name, email, password, role_id, grade, phone) VALUES (?, ?, ?, ?, ?, ?)',
            ['Test Student', email, 'hashedpw', roleId, '10th', '1234567890']
        );
        const studentId = res.insertId;
        console.log(`Created dummy student ${studentId} (${email})`);

        // Run Allocation for 10th grade
        await batchService.allocateStudentToBatches(studentId, '10th');

        // Verify
        const [enrollments] = await pool.query(
            'SELECT sb.*, b.name as batch_name, s.name as subject_name FROM student_batches sb JOIN batches b ON sb.batch_id = b.id JOIN subjects s ON b.subject_id = s.id WHERE sb.student_id = ?',
            [studentId]
        );

        console.log('Allocated Batches:', enrollments.map(e => `${e.subject_name}: ${e.batch_name}`));

        await pool.end();
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testBatchAllocation();
