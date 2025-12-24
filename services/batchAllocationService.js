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
        // 1. Check for an existing active batch with room
        // Using a default of 30 for max_students if not specified
        const [batches] = await this.pool.query(
            'SELECT * FROM batches WHERE subject_id = ? AND student_count < max_students ORDER BY created_at ASC LIMIT 1',
            [subjectId]
        );

        let batchId;

        if (batches.length > 0) {
            // Join existing batch
            batchId = batches[0].id;
            await this.pool.query('UPDATE batches SET student_count = student_count + 1 WHERE id = ?', [batchId]);
        } else {
            // 2. Need new batch: Find eligible instructors assigned to this subject by Super Instructor
            const [eligibleInstructors] = await this.pool.query(
                `SELECT u.id, s.name as subject_name FROM users u
                 JOIN instructor_subjects isub ON u.id = isub.instructor_id
                 JOIN subjects s ON isub.subject_id = s.id
                 WHERE isub.subject_id = ? AND u.is_active = 1`,
                [subjectId]
            );

            // CRITICAL: If no instructor is qualified for this subject yet, DO NOT create a stray batch.
            // The student will remain unassigned for this subject until the Super Instructor runs "Distribute".
            if (eligibleInstructors.length === 0) {
                console.log(`[BatchService] No qualified instructor for subject ${subjectId}. Skipping auto-allocation for student ${studentId}.`);
                return;
            }

            const instructorId = eligibleInstructors[0].id;
            const subjectName = eligibleInstructors[0].subject_name;

            // Create new batch for the qualified instructor
            const batchName = `${subjectName} - Auto Batch ${Date.now()}`;
            const [result] = await this.pool.query(
                'INSERT INTO batches (subject_id, instructor_id, name, student_count, max_students) VALUES (?, ?, ?, 1, 30)',
                [subjectId, instructorId, batchName]
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
