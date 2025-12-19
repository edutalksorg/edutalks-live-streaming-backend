const mysql = require('mysql2/promise');

class BatchAllocationService {
    constructor(pool) {
        this.pool = pool;
    }

    // Main function to allocate a student to batches for all subjects in their grade
    async allocateStudentToBatches(studentId, grade) {
        try {
            // 1. Get Class ID from Grade
            const [classes] = await this.pool.query('SELECT id FROM classes WHERE name = ?', [grade]);
            if (classes.length === 0) throw new Error(`Class ${grade} not found`);
            const classId = classes[0].id;

            // 2. Get All Subjects for this Class
            const [subjects] = await this.pool.query('SELECT id, name FROM subjects WHERE class_id = ?', [classId]);

            // 3. For each subject, find or create a batch
            for (const subject of subjects) {
                await this.assignToBatch(studentId, subject.id);
            }

            console.log(`Student ${studentId} allocated to batches for grade ${grade}`);
        } catch (error) {
            console.error('Batch Allocation Error:', error);
            throw error;
        }
    }

    async assignToBatch(studentId, subjectId) {
        // Find an active batch with < 30 students
        const [batches] = await this.pool.query(
            'SELECT * FROM batches WHERE subject_id = ? AND is_active = TRUE AND student_count < 30 ORDER BY created_at ASC LIMIT 1',
            [subjectId]
        );

        let batchId;

        if (batches.length > 0) {
            // Use existing batch
            batchId = batches[0].id;
            // Update count
            await this.pool.query('UPDATE batches SET student_count = student_count + 1 WHERE id = ?', [batchId]);
        } else {
            // Create NEW Batch
            // Logic: Assign to a new Instructor? 
            // For now, we will assign to a default 'Pending Instructor' or pick round-robin if we had a pool.
            // Simplified: Pick the first available instructor for that subject or a default dummy one if none involved.
            // In a real scenario, Super Instructor would manually assign the instructor to the new batch, 
            // OR we pick from a pool of instructors tagged with this subject.

            // Let's check if there are instructors available. 
            // For MVP, we'll try to reuse an instructor or assign to a default placeholder.
            // Let's assume we pick a 'Super Instructor' as fallback or just the first instructor found.

            const [instructors] = await this.pool.query('SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = "instructor") LIMIT 1');
            const instructorId = instructors.length > 0 ? instructors[0].id : 1; // Fallback to ID 1 (admin) if no instructor

            // Create new batch
            const [result] = await this.pool.query(
                'INSERT INTO batches (subject_id, instructor_id, name, student_count) VALUES (?, ?, ?, 1)',
                [subjectId, instructorId, `Batch ${Date.now()}`]
            );
            batchId = result.insertId;
        }

        // Enroll Student
        await this.pool.query(
            'INSERT INTO student_batches (student_id, batch_id) VALUES (?, ?)',
            [studentId, batchId]
        );
    }
}

module.exports = BatchAllocationService;
