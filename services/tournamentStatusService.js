/**
 * Tournament Status Service
 * Automatically updates tournament status based on time
 */

const startTournamentStatusService = (pool) => {
    console.log('🏆 Tournament Status Service started...');

    // Run every 30 seconds
    setInterval(async () => {
        try {
            const now = new Date();

            // 1. UPCOMING -> LIVE
            const [upcomingToLive] = await pool.query(`
                UPDATE tournaments 
                SET status = 'LIVE' 
                WHERE status = 'UPCOMING' 
                AND exam_start <= NOW() 
                AND exam_end > NOW()
            `);

            if (upcomingToLive.affectedRows > 0) {
                console.log(`[Status Service] Activated ${upcomingToLive.affectedRows} tournaments to LIVE`);
            }

            // 2. LIVE/UPCOMING -> COMPLETED
            const [anyToCompleted] = await pool.query(`
                UPDATE tournaments 
                SET status = 'COMPLETED' 
                WHERE status IN ('LIVE', 'UPCOMING') 
                AND exam_end <= NOW()
            `);

            if (anyToCompleted.affectedRows > 0) {
                console.log(`[Status Service] Moved ${anyToCompleted.affectedRows} tournaments to COMPLETED`);
            }

        } catch (err) {
            console.error('[Status Service] Error updating tournament statuses:', err);
        }
    }, 30000); // 30 seconds
};

module.exports = { startTournamentStatusService };
