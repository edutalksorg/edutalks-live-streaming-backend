const emailService = require('./emailService');

const startReminderService = (db) => {
    console.log('Reminder service started...');

    // Run every minute
    setInterval(async () => {
        try {
            // Find classes starting in the next 6 minutes that haven't had a reminder sent
            // We use 6 minutes to catch classes that might be exactly 5 mins away but slightly off the minute mark
            const [classes] = await db.query(`
                SELECT lc.*, u.name as instructor_name, u.email as instructor_email, s.name as subject_name
                FROM live_classes lc
                JOIN users u ON lc.instructor_id = u.id
                LEFT JOIN subjects s ON lc.subject_id = s.id
                WHERE lc.status = 'scheduled' 
                AND lc.reminder_sent = FALSE 
                AND lc.start_time <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)
                AND lc.start_time > NOW()
            `);

            for (const cls of classes) {
                console.log(`Sending reminders for class: ${cls.title} (ID: ${cls.id})`);

                // 1. Send to Instructor
                emailService.sendClassReminderEmail(
                    cls.instructor_email,
                    cls.instructor_name,
                    cls.subject_name || cls.title,
                    cls.start_time,
                    'instructor'
                );

                // 2. Fetch assigned students
                const [students] = await db.query(`
                    SELECT u.name, u.email 
                    FROM users u
                    JOIN student_batches sb ON u.id = sb.student_id
                    JOIN batches b ON sb.batch_id = b.id
                    WHERE b.instructor_id = ? AND b.subject_id = ?
                `, [cls.instructor_id, cls.subject_id]);

                // 3. Send to Students
                for (const student of students) {
                    emailService.sendClassReminderEmail(
                        student.email,
                        student.name,
                        cls.subject_name || cls.title,
                        cls.start_time,
                        'student'
                    );
                }

                // 4. Mark as sent
                await db.query('UPDATE live_classes SET reminder_sent = TRUE WHERE id = ?', [cls.id]);
            }
        } catch (err) {
            console.error('Error in reminder service:', err);
        }
    }, 60000); // 60 seconds
};

module.exports = { startReminderService };
