// Handles CRUD, Registration, Exam Execution, Leaderboard, and Results
const notificationService = require('../services/notificationService');

// Safe JSON Parse helper
const safeParse = (data) => {
    if (typeof data === 'object' && data !== null) return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        return data;
    }
};

// Format ISO or datetime-local string to MySQL YYYY-MM-DD HH:mm:ss (Preserving Exact Input)
const formatDateForMySQL = (dateStr) => {
    if (!dateStr) return null;
    try {
        // If it's already a MySQL formatted string, return it
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;

        // Convert common formats (T separator) to MySQL format
        // This ensures that what the user typed in 'datetime-local' is stored exactly
        return dateStr.replace('T', ' ').split('.')[0].slice(0, 19);
    } catch (e) {
        return null;
    }
};


/**
 * Create a new tournament (Instructor/Admin only)
 * Validates date windows and instructor authorization
 */
exports.createTournament = async (req, res) => {
    const db = req.app.locals.db;
    const instructorId = req.user.id;

    const {
        name,
        description,
        level_id,
        subject_id,
        registration_start,
        registration_end,
        exam_start,
        exam_end,
        duration,
        total_questions,
        total_marks = 100,
        max_participants = null,
        questions,
        is_free = true,
        prize = null,
        grade,
        tab_switch_limit = 3,
        screenshot_block = false
    } = req.body;

    try {
        // Validation: Check date sequence
        const regStart = new Date(registration_start);
        const regEnd = new Date(registration_end);
        const examStart = new Date(exam_start);
        const examEnd = new Date(exam_end);

        if (regStart >= regEnd || regEnd >= examStart || examStart >= examEnd) {
            return res.status(400).json({
                message: 'Invalid date sequence. Must be: registration_start < registration_end < exam_start < exam_end'
            });
        }

        // Validation: Duration check
        if (duration < 10 || duration > 240) {
            return res.status(400).json({
                message: 'Duration must be between 10 and 240 minutes'
            });
        }

        // Validation: Questions array
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                message: 'Questions array is required and must not be empty'
            });
        }

        if (questions.length !== total_questions) {
            return res.status(400).json({
                message: `Questions array length (${questions.length}) must match total_questions (${total_questions})`
            });
        }

        // Convert empty string to null for subject_id
        const subjectIdValue = subject_id === '' || subject_id === null ? null : subject_id;

        // Insert tournament
        const [result] = await db.query(
            `INSERT INTO tournaments 
            (name, description, level_id, subject_id, instructor_id, 
             registration_start, registration_end, exam_start, exam_end, 
             duration, total_questions, total_marks, max_participants, 
             questions, is_free, prize, grade, tab_switch_limit, screenshot_block, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
            [name, description, level_id, subjectIdValue, instructorId,
                formatDateForMySQL(registration_start), formatDateForMySQL(registration_end),
                formatDateForMySQL(exam_start), formatDateForMySQL(exam_end),
                duration, total_questions, total_marks, max_participants,
                JSON.stringify(questions), is_free ? 1 : 0, prize, grade, tab_switch_limit, screenshot_block ? 1 : 0]
        );

        const tournamentId = result.insertId;

        res.status(201).json({
            message: 'Tournament created successfully',
            tournamentId
        });
    } catch (err) {
        console.error('Create Tournament Error:', err);
        res.status(500).json({ message: 'Server error creating tournament' });
    }
};

/**
 * Update tournament (Only DRAFT/UPCOMING status allowed)
 */
exports.updateTournament = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        // Check ownership and status
        const [tournaments] = await db.query(
            'SELECT status, instructor_id FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const tournament = tournaments[0];

        if (tournament.instructor_id !== instructorId && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to update this tournament' });
        }

        if (!['DRAFT', 'UPCOMING'].includes(tournament.status)) {
            return res.status(400).json({ message: 'Can only update DRAFT or UPCOMING tournaments' });
        }

        // Build update query dynamically
        const allowedFields = [
            'name', 'description', 'level_id', 'subject_id',
            'registration_start', 'registration_end', 'exam_start', 'exam_end',
            'duration', 'total_questions', 'total_marks', 'max_participants',
            'questions', 'is_free', 'prize',
            'grade', 'tab_switch_limit', 'screenshot_block', 'status'
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ? `);
                let val = req.body[field];

                // Special handling for specific types
                if (field === 'questions') {
                    val = JSON.stringify(val);
                } else if (['registration_start', 'registration_end', 'exam_start', 'exam_end'].includes(field)) {
                    val = formatDateForMySQL(val);
                } else if ((field === 'subject_id' || field === 'max_participants' || field === 'level_id') && (val === '' || val === null || val === undefined)) {
                    val = null;
                }

                values.push(val);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(tournamentId);

        await db.query(
            `UPDATE tournaments SET ${updates.join(', ')} WHERE id = ? `,
            values
        );

        // Schedule notifications if status changed to UPCOMING
        if (req.body.status === 'UPCOMING' && tournament.status === 'DRAFT') {
            notificationService.scheduleNotifications(tournamentId, db);
        }

        res.json({ message: 'Tournament updated successfully' });
    } catch (err) {
        console.error('Update Tournament Error:', err);
        res.status(500).json({ message: 'Server error updating tournament' });
    }
};

/**
 * Delete tournament (Only DRAFT status allowed)
 */
exports.deleteTournament = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        const [tournaments] = await db.query(
            'SELECT status, instructor_id FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const tournament = tournaments[0];

        if (tournament.instructor_id !== instructorId && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to delete this tournament' });
        }

        if (tournament.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Can only delete DRAFT tournaments' });
        }

        await db.query('DELETE FROM tournaments WHERE id = ?', [tournamentId]);

        res.json({ message: 'Tournament deleted successfully' });
    } catch (err) {
        console.error('Delete Tournament Error:', err);
        res.status(500).json({ message: 'Server error deleting tournament' });
    }
};

/**
 * Get all tournaments for instructor with filters
 */
exports.getInstructorTournaments = async (req, res) => {
    const db = req.app.locals.db;
    const instructorId = req.user.id;
    const { status, level_id, subject_id } = req.query;

    try {
        // Get instructor's grade to show all tournaments from instructors of the same grade
        const [instructorData] = await db.query(
            'SELECT grade FROM users WHERE id = ?',
            [instructorId]
        );

        if (!instructorData || instructorData.length === 0) {
            return res.status(404).json({ message: 'Instructor not found' });
        }

        const instructorGrade = instructorData[0].grade;

        // Show tournaments from ALL instructors of the same grade
        let query = `
            SELECT t.*,
            tl.name as level_name,
            s.name as subject_name,
            u.name as instructor_name,
            (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = t.id) as registered_count
            FROM tournaments t
            INNER JOIN users u ON t.instructor_id = u.id
            LEFT JOIN tournament_levels tl ON t.level_id = tl.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.grade = ?
            `;

        const params = [instructorGrade];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (level_id) {
            query += ' AND t.level_id = ?';
            params.push(level_id);
        }

        if (subject_id) {
            query += ' AND t.subject_id = ?';
            params.push(subject_id);
        }

        query += ' ORDER BY t.exam_start DESC';

        const [tournaments] = await db.query(query, params);

        res.json(tournaments);
    } catch (err) {
        console.error('Get Instructor Tournaments Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get tournaments available to student (only from assigned instructors via batches)
 * KEY REQUIREMENT: Tournaments only visible to students assigned to the instructor
 */
exports.getStudentTournaments = async (req, res) => {
    const db = req.app.locals.db;
    const studentId = req.user.id;
    const { status, level_id } = req.query;

    try {
        // 1. Get student's grade and subscription plan from users table
        const [studentData] = await db.query(
            'SELECT grade, plan_name FROM users WHERE id = ?',
            [studentId]
        );

        if (studentData.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentGrade = studentData[0].grade;
        const planName = studentData[0].plan_name;

        // Check if student has a paid subscription (Premium, Pro, etc. - anything NOT 'Free')
        // We also want to allow tournaments that are explicitly marked as 'is_free' = 1
        const isPaid = planName && planName.toLowerCase() !== 'free';

        // Get tournaments from instructors of the same grade
        let query = `
            SELECT DISTINCT t.*,
            tl.name as level_name,
            s.name as subject_name,
            u.name as instructor_name,
            (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = t.id) as registered_count,
            (SELECT COUNT(*) > 0 FROM tournament_registrations tr2 WHERE tr2.tournament_id = t.id AND tr2.student_id = ?) as is_registered,
            (SELECT COUNT(*) > 0 FROM tournament_attempts ta WHERE ta.tournament_id = t.id AND ta.student_id = ?) as has_attempted
            FROM tournaments t
            INNER JOIN users u ON t.instructor_id = u.id
            LEFT JOIN tournament_levels tl ON t.level_id = tl.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.grade = ?
            AND t.status IN('UPCOMING', 'LIVE', 'COMPLETED', 'RESULT_PUBLISHED')
        `;

        if (!isPaid) {
            // Only show free tournaments for free users
            query += ' AND t.is_free = 1';
        }

        const params = [studentId, studentId, studentGrade];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (level_id) {
            query += ' AND t.level_id = ?';
            params.push(level_id);
        }

        query += ' ORDER BY t.exam_start ASC';

        const [tournaments] = await db.query(query, params);

        // Filter: If student is NOT paid, they should see NOTHING (per requirement)
        if (!isPaid) {
            return res.json([]);
        }

        res.json(tournaments);
    } catch (err) {
        console.error('Get Student Tournaments Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get single tournament details
 */
exports.getTournamentById = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const userId = req.user.id;

    try {
        const [tournaments] = await db.query(
            `SELECT t.*,
            tl.name as level_name,
            tl.category as level_category,
            s.name as subject_name,
            u.name as instructor_name,
            (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = t.id) as registered_count
             FROM tournaments t
             LEFT JOIN tournament_levels tl ON t.level_id = tl.id
             LEFT JOIN subjects s ON t.subject_id = s.id
             LEFT JOIN users u ON t.instructor_id = u.id
             WHERE t.id = ? `,
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const tournament = tournaments[0];

        // Check if student is registered
        if (req.user.role === 'student') {
            const [registrations] = await db.query(
                'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND student_id = ?',
                [tournamentId, userId]
            );
            tournament.is_registered = registrations.length > 0;

            // Check if student has attempted
            const [attempts] = await db.query(
                'SELECT * FROM tournament_attempts WHERE tournament_id = ? AND student_id = ?',
                [tournamentId, userId]
            );
            tournament.has_attempted = attempts.length > 0;

            // Hide questions from students until exam starts
            if (tournament.status !== 'LIVE' || !tournament.is_registered) {
                delete tournament.questions;
            }
        } else if (['instructor', 'super_instructor'].includes(req.user.role)) {
            // Instructor Shared Access Check: Must be same grade
            const [instructorData] = await db.query('SELECT grade FROM users WHERE id = ?', [userId]);
            if (instructorData.length > 0 && instructorData[0].grade !== tournament.grade && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'You can only view tournaments for your assigned grade' });
            }
        }

        res.json(tournament);
    } catch (err) {
        console.error('Get Tournament By ID Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Student registers for tournament
 */
exports.registerForTournament = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;

    try {
        // Get tournament details
        const [tournaments] = await db.query(
            'SELECT * FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const tournament = tournaments[0];
        const now = new Date();
        const regStart = new Date(tournament.registration_start);
        const regEnd = new Date(tournament.registration_end);

        // Check registration window
        if (now < regStart) {
            return res.status(400).json({ message: 'Registration has not started yet' });
        }

        if (now > regEnd) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // Check student payment status
        const [studentData] = await db.query(
            'SELECT grade, plan_name FROM users WHERE id = ?',
            [studentId]
        );

        if (studentData.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentGrade = studentData[0].grade;
        const planName = studentData[0].plan_name;

        // Check if student has a paid subscription
        const isPaid = planName && planName.toLowerCase() !== 'free';

        if (!isPaid) {
            return res.status(403).json({ message: 'Tournaments are available for paid subscribers only' });
        }

        // Check if student's grade matches tournament's grade
        if (tournament.grade !== studentGrade) {
            return res.status(403).json({ message: 'This tournament is not available for your grade' });
        }

        // Check max participants
        if (tournament.max_participants) {
            const [count] = await db.query(
                'SELECT COUNT(*) as count FROM tournament_registrations WHERE tournament_id = ?',
                [tournamentId]
            );

            if (count[0].count >= tournament.max_participants) {
                return res.status(400).json({ message: 'Tournament is full' });
            }
        }

        // Register student
        await db.query(
            'INSERT INTO tournament_registrations (tournament_id, student_id) VALUES (?, ?)',
            [tournamentId, studentId]
        );

        res.status(201).json({ message: 'Successfully registered for tournament' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Already registered for this tournament' });
        }
        console.error('Register Tournament Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Check registration status
 */
exports.checkRegistrationStatus = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;

    try {
        const [registrations] = await db.query(
            'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        res.json({
            is_registered: registrations.length > 0,
            registration: registrations[0] || null
        });
    } catch (err) {
        console.error('Check Registration Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get registered students (for instructor)
 */
exports.getRegisteredStudents = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        // Verify instructor owns this tournament
        const [tournaments] = await db.query(
            'SELECT instructor_id FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (tournaments[0].instructor_id !== instructorId && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const [students] = await db.query(
            `SELECT tr.id, tr.registered_at, u.id as student_id, u.name, u.email, u.grade
             FROM tournament_registrations tr
             INNER JOIN users u ON tr.student_id = u.id
             WHERE tr.tournament_id = ?
            ORDER BY tr.registered_at ASC`,
            [tournamentId]
        );

        res.json(students);
    } catch (err) {
        console.error('Get Registered Students Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Start tournament exam (create attempt record)
 */
exports.startTournamentExam = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;

    try {
        // Get tournament details
        const [tournaments] = await db.query(
            'SELECT * FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const tournament = tournaments[0];
        const now = new Date();
        const examStart = new Date(tournament.exam_start);
        const examEnd = new Date(tournament.exam_end);
        // Check exam timing
        if (now < examStart) {
            return res.status(400).json({ message: 'Exam has not started yet' });
        }

        if (now > examEnd) {
            return res.status(400).json({ message: 'Exam has ended' });
        }

        // Check registration
        const [registrations] = await db.query(
            'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        if (registrations.length === 0) {
            return res.status(403).json({ message: 'Not registered for this tournament' });
        }

        // Check if already attempted
        const [attempts] = await db.query(
            'SELECT * FROM tournament_attempts WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        if (attempts.length > 0) {
            // Return existing attempt
            return res.json({
                message: 'Exam already started',
                attempt: attempts[0],
                tournament: {
                    ...tournament,
                    questions: safeParse(tournament.questions)
                }
            });
        }

        // Create new attempt (with IGNORE and final check to be super safe)
        try {
            await db.query(
                `INSERT INTO tournament_attempts
                (tournament_id, student_id, started_at, total_marks, activity_log)
            VALUES(?, ?, NOW(), ?, '[]')`,
                [tournamentId, studentId, tournament.total_marks]
            );
        } catch (dbErr) {
            if (dbErr.code !== 'ER_DUP_ENTRY') throw dbErr;
            // If duplicate entry, just continue to fetch it
        }

        const [newAttempt] = await db.query(
            'SELECT * FROM tournament_attempts WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        res.json({
            message: 'Exam started successfully',
            attempt: newAttempt[0],
            tournament: {
                ...tournament,
                questions: safeParse(tournament.questions)
            }
        });
    } catch (err) {
        console.error('Start Tournament Exam Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Auto-save answers during exam
 */
exports.autoSaveAnswers = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;
    const { answers } = req.body;

    try {
        await db.query(
            'UPDATE tournament_attempts SET answers = ? WHERE tournament_id = ? AND student_id = ?',
            [JSON.stringify(answers), tournamentId, studentId]
        );

        res.json({ message: 'Answers saved' });
    } catch (err) {
        console.error('Auto Save Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Submit tournament exam (final submission)
 */
exports.submitTournamentExam = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;
    const { answers } = req.body;

    try {
        // Get tournament and attempt
        const [tournaments] = await db.query('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
        const [attempts] = await db.query(
            'SELECT * FROM tournament_attempts WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        if (tournaments.length === 0 || attempts.length === 0) {
            return res.status(404).json({ message: 'Tournament or attempt not found' });
        }

        const tournament = tournaments[0];
        const attempt = attempts[0];

        if (attempt.submitted_at) {
            return res.status(400).json({ message: 'Exam already submitted' });
        }

        // Calculate score
        const questions = safeParse(tournament.questions);
        let score = 0;
        let correctCount = 0;

        questions.forEach(q => {
            const studentAnswer = answers[q.id];
            if (studentAnswer === q.correct_answer) {
                score += q.marks || (tournament.total_marks / tournament.total_questions);
                correctCount++;
            }
        });

        const accuracy = (correctCount / questions.length) * 100;
        const timeTaken = Math.floor((new Date() - new Date(attempt.started_at)) / 1000);

        // Update attempt
        await db.query(
            `UPDATE tournament_attempts 
             SET answers = ?, score = ?, accuracy = ?, time_taken = ?, submitted_at = NOW()
             WHERE tournament_id = ? AND student_id = ? `,
            [JSON.stringify(answers), Math.round(score), accuracy.toFixed(2), timeTaken, tournamentId, studentId]
        );

        res.json({
            message: 'Exam submitted successfully',
            score: Math.round(score),
            accuracy: accuracy.toFixed(2),
            time_taken: timeTaken
        });
    } catch (err) {
        console.error('Submit Exam Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Log activity (tab switches, etc.)
 */
exports.logActivity = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;
    const { action, details } = req.body;

    try {
        // Get current attempt
        const [attempts] = await db.query(
            'SELECT * FROM tournament_attempts WHERE tournament_id = ? AND student_id = ?',
            [tournamentId, studentId]
        );

        if (attempts.length === 0) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        const attempt = attempts[0];
        const activityLog = attempt.activity_log ? safeParse(attempt.activity_log) : [];

        // Add new activity
        activityLog.push({
            timestamp: new Date().toISOString(),
            action,
            details
        });

        // Update tab switches count if action is tab_switch
        let tabSwitches = attempt.tab_switches;
        if (action === 'tab_switch') {
            tabSwitches++;
        }

        await db.query(
            'UPDATE tournament_attempts SET activity_log = ?, tab_switches = ? WHERE tournament_id = ? AND student_id = ?',
            [JSON.stringify(activityLog), tabSwitches, tournamentId, studentId]
        );

        res.json({ message: 'Activity logged' });
    } catch (err) {
        console.error('Log Activity Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get leaderboard
 */
exports.getLeaderboard = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;

    try {
        const [tournaments] = await db.query('SELECT status FROM tournaments WHERE id = ?', [tournamentId]);
        if (tournaments.length === 0) return res.status(404).json({ message: 'Tournament not found' });

        const isOfficial = tournaments[0].status === 'RESULT_PUBLISHED';

        const [leaderboard] = await db.query(
            `SELECT 
                u.id as student_id, u.name as student_name, u.grade,
                ta.ranking, ta.score, ta.accuracy, ta.time_taken, ta.submitted_at
             FROM tournament_registrations tr
             JOIN users u ON tr.student_id = u.id
             LEFT JOIN tournament_attempts ta ON tr.student_id = ta.student_id AND tr.tournament_id = ta.tournament_id
             WHERE tr.tournament_id = ?
             ORDER BY COALESCE(ta.score, 0) DESC, COALESCE(ta.accuracy, 0) DESC, ta.time_taken ASC, u.name ASC`,
            [tournamentId]
        );

        // Assign ranks (dynamic based on current scores)
        leaderboard.forEach((entry, index) => {
            entry.ranking = index + 1;
            entry.is_official = isOfficial;
            entry.score = entry.score || 0;
            entry.accuracy = entry.accuracy || 0;
            entry.time_taken = entry.time_taken || 0;
        });

        res.json(leaderboard);
    } catch (err) {
        console.error('Get Leaderboard Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get student's result
 */
exports.getStudentResult = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const studentId = req.user.id;

    try {
        const [attempts] = await db.query(
            `SELECT ta.*, t.name as tournament_name, t.total_marks
             FROM tournament_attempts ta
             INNER JOIN tournaments t ON ta.tournament_id = t.id
             WHERE ta.tournament_id = ? AND ta.student_id = ? `,
            [tournamentId, studentId]
        );

        if (attempts.length === 0) {
            return res.status(404).json({ message: 'No attempt found' });
        }

        const attempt = attempts[0];

        // Get rank
        const [ranking] = await db.query(
            `SELECT COUNT(*) + 1 as ranking
             FROM tournament_attempts
             WHERE tournament_id = ? AND submitted_at IS NOT NULL
        AND(score > ? OR(score = ? AND time_taken < ?))`,
            [tournamentId, attempt.score, attempt.score, attempt.time_taken]
        );

        attempt.ranking = ranking[0].ranking;

        res.json(attempt);
    } catch (err) {
        console.error('Get Student Result Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Publish results (Update ranks and change status)
 */
exports.publishResults = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        // Verify ownership
        const [tournaments] = await db.query(
            'SELECT instructor_id, status, exam_end FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const now = new Date();
        const examEnd = new Date(tournaments[0].exam_end);

        if (now < examEnd) {
            return res.status(400).json({ message: 'Exam is still in progress. Results can only be published after the exam ends.' });
        }

        if (tournaments[0].instructor_id !== instructorId && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (tournaments[0].status === 'RESULT_PUBLISHED') {
            return res.status(400).json({ message: 'Results already published' });
        }

        // Calculate and update ranks
        const [attempts] = await db.query(
            `SELECT id, score, accuracy, time_taken
             FROM tournament_attempts
             WHERE tournament_id = ? AND submitted_at IS NOT NULL
             ORDER BY score DESC, accuracy DESC, time_taken ASC`,
            [tournamentId]
        );

        for (let i = 0; i < attempts.length; i++) {
            await db.query(
                'UPDATE tournament_attempts SET ranking = ? WHERE id = ?',
                [i + 1, attempts[i].id]
            );
        }

        // Update tournament status
        await db.query(
            'UPDATE tournaments SET status = ? WHERE id = ?',
            ['RESULT_PUBLISHED', tournamentId]
        );

        res.json({ message: 'Results published successfully' });
    } catch (err) {
        console.error('Publish Results Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get tournament statistics (for admin/instructor dashboard)
 */
exports.getTournamentStats = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        // Verify ownership
        const [tournaments] = await db.query(
            'SELECT instructor_id FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (tournaments[0].instructor_id !== instructorId && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get stats
        const [stats] = await db.query(
            `SELECT
            (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = ?) as total_registered,
            (SELECT COUNT(*) FROM tournament_attempts WHERE tournament_id = ? AND started_at IS NOT NULL) as total_started,
                (SELECT COUNT(*) FROM tournament_attempts WHERE tournament_id = ? AND submitted_at IS NOT NULL) as total_submitted,
                    (SELECT AVG(score) FROM tournament_attempts WHERE tournament_id = ? AND submitted_at IS NOT NULL) as avg_score,
                        (SELECT MAX(score) FROM tournament_attempts WHERE tournament_id = ? AND submitted_at IS NOT NULL) as max_score,
                            (SELECT MIN(score) FROM tournament_attempts WHERE tournament_id = ? AND submitted_at IS NOT NULL) as min_score`,
            [tournamentId, tournamentId, tournamentId, tournamentId, tournamentId, tournamentId]
        );

        res.json(stats[0]);
    } catch (err) {
        console.error('Get Tournament Stats Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get monitoring data (for instructors during live tournament)
 */
exports.getMonitoringData = async (req, res) => {
    const db = req.app.locals.db;
    const tournamentId = req.params.id;
    const instructorId = req.user.id;

    try {
        // 1. Verify ownership
        const [tournaments] = await db.query(
            'SELECT name, status, exam_start, exam_end FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (tournaments.length === 0) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
            const [instructorGrade] = await db.query('SELECT grade FROM users WHERE id = ?', [instructorId]);
            const [ownerGrade] = await db.query('SELECT t.grade FROM tournaments t JOIN users u ON t.instructor_id = u.id WHERE t.id = ?', [tournamentId]);

            if (instructorGrade[0].grade !== ownerGrade[0].grade) {
                return res.status(403).json({ message: 'Not authorized for this grade' });
            }
        }

        // 2. Get Statistics
        const [stats] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = ?) as total_registered,
                (SELECT COUNT(*) FROM tournament_attempts WHERE tournament_id = ? AND started_at IS NOT NULL) as total_started,
                (SELECT COUNT(*) FROM tournament_attempts WHERE tournament_id = ? AND submitted_at IS NOT NULL) as total_submitted`,
            [tournamentId, tournamentId, tournamentId]
        );

        // 3. Get Student Progress List
        const [students] = await db.query(
            `SELECT 
                u.id as student_id,
                u.name as student_name,
                ta.started_at,
                ta.submitted_at,
                ta.score,
                ta.tab_switches,
                ta.answers
            FROM tournament_registrations tr
            JOIN users u ON tr.student_id = u.id
            LEFT JOIN tournament_attempts ta ON tr.student_id = ta.student_id AND tr.tournament_id = ta.tournament_id
            WHERE tr.tournament_id = ?
            ORDER BY u.name ASC`,
            [tournamentId]
        );

        res.json({
            tournament: tournaments[0],
            stats: stats[0],
            students: students.map(s => {
                let answers = s.answers;
                if (typeof answers === 'string') {
                    try {
                        answers = JSON.parse(answers);
                    } catch (e) {
                        answers = {};
                    }
                }
                return {
                    ...s,
                    answers: answers,
                    questions_answered: answers ? Object.keys(answers).length : 0
                };
            })
        });
    } catch (err) {
        console.error('Get Monitoring Data Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get all tournament levels
 */
exports.getTournamentLevels = async (req, res) => {
    const db = req.app.locals.db;

    try {
        const [levels] = await db.query(
            'SELECT * FROM tournament_levels WHERE is_active = true ORDER BY display_order ASC'
        );

        res.json(levels);
    } catch (err) {
        console.error('Get Tournament Levels Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
