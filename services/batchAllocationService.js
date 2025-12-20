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
        // 1. Check for an existing active batch with < 30 students
        const [batches] = await this.pool.query(
            'SELECT * FROM batches WHERE subject_id = ? AND is_active = TRUE AND student_count < 30 ORDER BY created_at ASC LIMIT 1',
            [subjectId]
        );

        let batchId;

        if (batches.length > 0) {
            // Join existing batch
            batchId = batches[0].id;
            await this.pool.query('UPDATE batches SET student_count = student_count + 1 WHERE id = ?', [batchId]);
        } else {
            // 2. Need new batch: Find next eligible instructor
            // Fetch instructors eligible for this subject from instructor_subjects
            const [eligibleInstructors] = await this.pool.query(
                `SELECT u.id FROM users u
                 JOIN instructor_subjects isub ON u.id = isub.instructor_id
                 WHERE isub.subject_id = ? AND u.is_active = 1`,
                [subjectId]
            );

            let instructorId;

            if (eligibleInstructors.length > 0) {
                // Round-Robin or Load Balancing Logic
                // Find instructor with the fewest ACTIVE batches or students for this subject
                // Simplified: Just pick one that isn't full (which we know current ones are full or don't exist)
                // We'll iterate or pick one. For better distribution, let's query batch counts.
                // But for now, picking the first eligible one is fine if we assume sequential filling.
                // To support "Next 30 members there will be other instructor", we need to see who has the *active* batch.
                // If the previous active batch was full, we should pick a *different* instructor if possible.

                // Let's Find the IDs of instructors who have recently filled batches
                // and try to pick a different one.
                const [recentBatches] = await this.pool.query(
                    'SELECT instructor_id FROM batches WHERE subject_id = ? ORDER BY created_at DESC LIMIT 5',
                    [subjectId]
                );

                // Exclude recently assigned if multiple exist
                const recentInstructorIds = recentBatches.map(b => b.instructor_id);
                const candidates = eligibleInstructors.filter(i => !recentInstructorIds.includes(i.id));

                if (candidates.length > 0) {
                    instructorId = candidates[0].id;
                } else {
                    // Recycle instructors if all have had a turn
                    instructorId = eligibleInstructors[0].id;
                }

            } else {
                // Fallback: No specific instructor assigned to subject. Pick any instructor or admin.
                const [instructors] = await this.pool.query('SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = "instructor") LIMIT 1');
                instructorId = instructors.length > 0 ? instructors[0].id : 1;
            }

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
