const superInstructorController = {
    getDashboard: async (req, res) => {
        try {
            const db = req.app.locals.db;
            const userId = req.user.id; // Super Instructor ID

            // 1. Get Assigned Class/Grade
            const [assignments] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [userId]);
            if (assignments.length === 0) {
                return res.json({ message: "No class assigned", stats: {}, subjects: [] });
            }
            const classId = assignments[0].class_id;

            // 2. Get Class Name
            const [classes] = await db.query('SELECT name FROM classes WHERE id = ?', [classId]);
            const className = classes[0].name;

            // 3. Stats
            // Total Students in this Grade
            const [students] = await db.query(
                'SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "student" AND u.grade = ?',
                [className]
            );

            // Total Instructors managing subjects for this class
            // Updated: Count distinct instructors from the batches table linked to subjects of this class
            const [instructors] = await db.query(
                `SELECT COUNT(DISTINCT b.instructor_id) as count 
                 FROM batches b 
                 JOIN subjects s ON b.subject_id = s.id 
                 WHERE s.class_id = ?`,
                [classId]
            );

            // 4. Detailed Data: Subjects -> Batches -> Instructors
            const [subjects] = await db.query('SELECT * FROM subjects WHERE class_id = ?', [classId]);

            const detailedSubjects = [];
            for (const sub of subjects) {
                // Get Batches for this subject
                const [batches] = await db.query(`
                    SELECT b.id, b.name, b.student_count, b.max_students, u.name as instructor_name, u.email as instructor_email, u.id as instructor_id
                    FROM batches b
                    LEFT JOIN users u ON b.instructor_id = u.id
                    WHERE b.subject_id = ?
                    ORDER BY b.id ASC
                `, [sub.id]);

                // Calculate Total Assigned for this subject
                const totalAssigned = batches.reduce((sum, b) => sum + (b.student_count || 0), 0);

                // Assuming students[0].count gives total active students in grade
                const totalGradeStudents = students[0].count;
                const unassignedCount = Math.max(0, totalGradeStudents - totalAssigned);

                detailedSubjects.push({
                    ...sub,
                    batches: batches,
                    totalAssigned,
                    unassignedCount
                });
            }

            // 5. Add Curriculum Meta-data
            // Helper to guess curriculum from name
            const getCurriculum = (name) => {
                const lower = name.toLowerCase();
                if (lower.includes('(state)')) return 'State';
                if (lower.includes('(central)')) return 'Central';
                return 'General';
            };

            const subjectsWithCurriculum = detailedSubjects.map(sub => ({
                ...sub,
                curriculum: getCurriculum(sub.name)
            }));

            res.json({
                className,
                stats: {
                    totalStudents: students[0].count,
                    totalInstructors: instructors[0].count
                },
                subjects: subjectsWithCurriculum
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAllInstructors: async (req, res) => {
        try {
            // Fetch instructors relevant to this SI's grade
            // 1. Get SI's Grade
            const userId = req.user.id;
            const db = req.app.locals.db;
            const [assignments] = await db.query('SELECT c.name as grade FROM class_super_instructors cs JOIN classes c ON cs.class_id = c.id WHERE cs.super_instructor_id = ?', [userId]);

            if (assignments.length === 0) return res.json([]);
            const grade = assignments[0].grade;

            const [instructors] = await db.query(
                `SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.phone
                 FROM users u 
                 WHERE u.role_id = (SELECT id FROM roles WHERE name = 'instructor')
                 AND u.grade = ?`,
                [grade]
            );
            res.json(instructors);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getPendingInstructors: async (req, res) => {
        try {
            const userId = req.user.id;
            const db = req.app.locals.db;

            // 1. Get SI's Grade
            const [assignments] = await db.query('SELECT c.name as grade FROM class_super_instructors cs JOIN classes c ON cs.class_id = c.id WHERE cs.super_instructor_id = ?', [userId]);
            if (assignments.length === 0) return res.json([]);
            const grade = assignments[0].grade;

            const [instructors] = await db.query(
                `SELECT u.id, u.name, u.email, u.created_at, u.phone
                 FROM users u 
                 WHERE u.role_id = (SELECT id FROM roles WHERE name = 'instructor')
                 AND u.grade = ?
                 AND u.is_active = 0`,
                [grade]
            );
            res.json(instructors);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    approveInstructor: async (req, res) => {
        try {
            const { instructorId } = req.body;
            await req.app.locals.db.query('UPDATE users SET is_active = 1 WHERE id = ?', [instructorId]);
            res.json({ message: 'Instructor approved successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    assignInstructorToSubject: async (req, res) => {
        const { instructorId, subjectId } = req.body;
        const superInstructorId = req.user.id;
        const db = req.app.locals.db;

        try {
            // 0. Security: Verify SI's Class/Grade
            const [siClass] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [superInstructorId]);
            if (siClass.length === 0) return res.status(403).json({ message: "No class assigned to you." });
            const siClassId = siClass[0].class_id;

            // 1. Validate Subject ownership
            const [subCheck] = await db.query('SELECT class_id FROM subjects WHERE id = ?', [subjectId]);
            if (!subCheck.length || subCheck[0].class_id !== siClassId) {
                return res.status(403).json({ message: "This subject does not belong to your assigned grade." });
            }

            // 2. Validate Instructor Grade match
            // Get Class Name first
            const [cls] = await db.query('SELECT name FROM classes WHERE id = ?', [siClassId]);
            const gradeName = cls[0].name;

            const [instCheck] = await db.query('SELECT grade FROM users WHERE id = ?', [instructorId]);
            if (!instCheck.length || instCheck[0].grade !== gradeName) {
                return res.status(403).json({ message: "Instructor does not belong to your assigned grade." });
            }

            // 1. Strict Global Check: Is instructor already teaching ANY subject (in any batch)?
            // We check the 'batches' table now, as that's the source of truth for assignments.
            const [existing] = await db.query(
                'SELECT * FROM batches WHERE instructor_id = ?',
                [instructorId]
            );

            if (existing.length > 0) {
                return res.status(400).json({ message: 'Instructor is already assigned to a subject/batch. One subject per instructor only.' });
            }

            // 2. Create the Batch Assignment (Qualifier)
            // This ensures BatchAllocationService knows who can teach this subject
            await db.query(
                'INSERT IGNORE INTO instructor_subjects (instructor_id, subject_id, assigned_by) VALUES (?, ?, ?)',
                [instructorId, subjectId, superInstructorId]
            );

            // 3. Create the first Batch
            // Get Subject Name for batch naming
            const [subs] = await db.query('SELECT name FROM subjects WHERE id = ?', [subjectId]);
            const subjectName = subs[0]?.name || 'Unknown';

            // Get Instructor Name
            const [insts] = await db.query('SELECT name FROM users WHERE id = ?', [instructorId]);
            const instName = insts[0]?.name || 'Instructor';

            const batchName = `${subjectName} - ${instName}`;

            await db.query(
                'INSERT INTO batches (name, subject_id, instructor_id) VALUES (?, ?, ?)',
                [batchName, subjectId, instructorId]
            );

            res.json({ message: 'Instructor assigned, qualification recorded, and new batch created successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    distributeStudents: async (req, res) => {
        const { subjectId } = req.body;
        const db = req.app.locals.db;

        try {
            // 1. Get All Batches for this Subject (Ordered by ID to ensure sequential filling)
            const [batches] = await db.query(
                'SELECT * FROM batches WHERE subject_id = ? ORDER BY id ASC',
                [subjectId]
            );

            if (batches.length === 0) {
                return res.status(400).json({ message: "No instructors assigned to this subject yet." });
            }

            // 2. Get All Students in the Grade
            // First find the class_id from the subject
            const [subInfo] = await db.query('SELECT class_id FROM subjects WHERE id = ?', [subjectId]);
            if (subInfo.length === 0) return res.status(404).json({ message: "Subject not found" });
            const classId = subInfo[0].class_id;

            // Get Class Name (Grade) to filter users
            const [classInfo] = await db.query('SELECT name FROM classes WHERE id = ?', [classId]);
            const grade = classInfo[0].name;

            // Get all active students in this grade
            const [allStudents] = await db.query(
                `SELECT u.id FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE r.name = 'student' AND u.grade = ? AND u.is_active = 1`,
                [grade]
            );

            // 3. Find Unassigned Students for this Subject
            // A student is assigned if they are in 'student_batches' linked to a batch of this subject
            const [assignedRows] = await db.query(`
                SELECT sb.student_id 
                FROM student_batches sb 
                JOIN batches b ON sb.batch_id = b.id 
                WHERE b.subject_id = ?
            `, [subjectId]);

            const assignedIds = new Set(assignedRows.map(row => row.student_id));
            const unassignedStudents = allStudents.filter(s => !assignedIds.has(s.id));

            if (unassignedStudents.length === 0) {
                return res.json({ message: "All students are already assigned to batches for this subject." });
            }

            // 4. Distribute Sequentially
            let studentIdx = 0;
            let newlyAssigned = 0;

            for (const batch of batches) {
                if (studentIdx >= unassignedStudents.length) break;

                // Check current batch count
                const [countRes] = await db.query('SELECT COUNT(*) as count FROM student_batches WHERE batch_id = ?', [batch.id]);
                let currentCount = countRes[0].count;
                const capacity = batch.max_students || 2; // Use dynamic capacity from DB

                if (currentCount >= capacity) continue; // Batch full, move to next

                const room = capacity - currentCount;
                const toAssign = unassignedStudents.slice(studentIdx, studentIdx + room);

                // Insert into student_batches
                if (toAssign.length > 0) {
                    const values = toAssign.map(s => [s.id, batch.id]);
                    await db.query('INSERT INTO student_batches (student_id, batch_id) VALUES ?', [values]);

                    // Update student_count in batches table cache
                    await db.query('UPDATE batches SET student_count = student_count + ? WHERE id = ?', [toAssign.length, batch.id]);

                    newlyAssigned += toAssign.length;
                    studentIdx += toAssign.length;
                }
            }

            res.json({
                message: `Distribution complete. Assigned ${newlyAssigned} students.`,
                remainingUnassigned: unassignedStudents.length - newlyAssigned
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during distribution' });
        }
    },

    getStudents: async (req, res) => {
        try {
            const userId = req.user.id;
            const db = req.app.locals.db;

            // 1. Get SI's Grade
            const [assignments] = await db.query('SELECT c.name as grade FROM class_super_instructors cs JOIN classes c ON cs.class_id = c.id WHERE cs.super_instructor_id = ?', [userId]);
            if (assignments.length === 0) return res.json([]);
            const grade = assignments[0].grade;

            const [students] = await db.query(
                `SELECT u.id, u.name, u.email, u.created_at, u.phone, u.is_active
                 FROM users u 
                 WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
                 AND u.grade = ?`,
                [grade]
            );
            res.json(students);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getBatchDetails: async (req, res) => {
        const { batchId } = req.params;
        const db = req.app.locals.db;

        try {
            const userId = req.user.id;

            // 0. Security: Get SI's Class ID
            const [siClass] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [userId]);
            if (siClass.length === 0) return res.status(403).json({ message: "No class assigned." });
            const siClassId = siClass[0].class_id;

            // 1. Get Batch & Instructor & Subject Info (AND Verify Class Ownership)
            const [batchInfo] = await db.query(`
                SELECT b.id, b.name as batch_name, 
                       u.name as instructor_name, u.email as instructor_email,
                       s.name as subject_name
                FROM batches b
                LEFT JOIN users u ON b.instructor_id = u.id
                JOIN subjects s ON b.subject_id = s.id
                WHERE b.id = ?
            `, [batchId]);

            if (batchInfo.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }

            // Verify Subject's Class ID matches SI's Class ID
            // batchInfo query joins subjects, so we can check it if we select class_id, or we do a quick check here.
            // Let's modify the query above to select s.class_id, or do a check.
            const [subCheck] = await db.query('SELECT class_id FROM subjects WHERE name = ?', [batchInfo[0].subject_name]);
            // Better: select class_id in the main query.
            // Retrying with simpler check: fetch subject ID from batch
            const [bSub] = await db.query('SELECT subject_id FROM batches WHERE id = ?', [batchId]);
            const [sClass] = await db.query('SELECT class_id FROM subjects WHERE id = ?', [bSub[0].subject_id]);

            if (sClass[0].class_id !== siClassId) {
                return res.status(403).json({ message: "Access denied. Batch belongs to a different grade." });
            }

            // 2. Get Students in this Batch
            const [students] = await db.query(`
                SELECT u.id, u.name, u.email, u.phone
                FROM student_batches sb
                JOIN users u ON sb.student_id = u.id
                WHERE sb.batch_id = ?
            `, [batchId]);

            res.json({
                ...batchInfo[0],
                students
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching batch details' });
        }
    },
    resetAssignments: async (req, res) => {
        const db = req.app.locals.db;
        const userId = req.user.id;

        try {
            // 0. Security: Get SI's Class ID
            const [siClass] = await db.query('SELECT class_id FROM class_super_instructors WHERE super_instructor_id = ?', [userId]);
            if (siClass.length === 0) return res.status(403).json({ message: "No class assigned." });
            const siClassId = siClass[0].class_id;

            // 1. Get List of Batches for this class needed to be deleted? 
            // OR simply delete batches where subject belongs to this class.

            // Delete batches linked to subjects of this class
            // Using a JOIN delete
            await db.query(`
                DELETE b FROM batches b
                JOIN subjects s ON b.subject_id = s.id
                WHERE s.class_id = ?
            `, [siClassId]);

            res.json({ message: "All allocations have been reset. You can now start fresh." });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error resetting assignments' });
        }
    }
};

module.exports = superInstructorController;
