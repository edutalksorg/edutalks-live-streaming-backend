/**
 * Status Service
 * Automatically updates tournament and live class statuses based on time
 */

const startStatusService = (pool, io) => {
    console.log('🚀 Status Service started...');

    // Run every 30 seconds
    setInterval(async () => {
        try {
            // 1. TOURNAMENTS: UPCOMING -> LIVE
            const [upcomingTournaments] = await pool.query(`
                UPDATE tournaments 
                SET status = 'LIVE' 
                WHERE status = 'UPCOMING' 
                AND exam_start <= UTC_TIMESTAMP() 
                AND exam_end > UTC_TIMESTAMP()
            `);

            if (upcomingTournaments.affectedRows > 0) {
                console.log(`[Status Service] Activated ${upcomingTournaments.affectedRows} tournaments to LIVE`);
                if (io) io.emit('global_sync', { type: 'tournaments', action: 'update' });
            }

            // 2. TOURNAMENTS: LIVE/UPCOMING -> COMPLETED
            const [completedTournaments] = await pool.query(`
                UPDATE tournaments 
                SET status = 'COMPLETED' 
                WHERE status IN ('LIVE', 'UPCOMING') 
                AND exam_end <= UTC_TIMESTAMP()
            `);

            if (completedTournaments.affectedRows > 0) {
                console.log(`[Status Service] Moved ${completedTournaments.affectedRows} tournaments to COMPLETED`);
                if (io) io.emit('global_sync', { type: 'tournaments', action: 'update' });
            }

            // 3. REGULAR CLASSES: SCHEDULED -> LIVE
            // Using UTC_TIMESTAMP() to be consistent with tournament logic
            const [upcomingClasses] = await pool.query(`
                UPDATE live_classes 
                SET status = 'live' 
                WHERE status = 'scheduled' 
                AND start_time <= UTC_TIMESTAMP()
            `);

            if (upcomingClasses.affectedRows > 0) {
                console.log(`[Status Service] Activated ${upcomingClasses.affectedRows} regular classes to LIVE`);
                if (io) {
                    io.emit('class_live', { status: 'live' });
                    io.emit('global_sync', { type: 'classes', action: 'start' });
                }
            }

            // 4. SUPER INSTRUCTOR CLASSES: SCHEDULED -> LIVE
            const [upcomingSiClasses] = await pool.query(`
                UPDATE super_instructor_classes 
                SET status = 'live' 
                WHERE status = 'scheduled' 
                AND start_time <= UTC_TIMESTAMP()
            `);

            if (upcomingSiClasses.affectedRows > 0) {
                console.log(`[Status Service] Activated ${upcomingSiClasses.affectedRows} super instructor classes to LIVE`);
                if (io) {
                    io.emit('si_class_live', { status: 'live' });
                    io.emit('global_sync', { type: 'classes', action: 'start' });
                }
            }

        } catch (err) {
            console.error('[Status Service] Error updating statuses:', err);
        }
    }, 30000); // 30 seconds
};

module.exports = { startStatusService };
