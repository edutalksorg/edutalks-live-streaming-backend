const dashboardController = {
    getAdminStats: async (req, res) => {
        try {
            const db = req.app.locals.db;

            // 1. Total Users
            const [usersResult] = await db.query('SELECT COUNT(*) as count FROM users');
            const totalUsers = usersResult[0].count;

            // 2. Total Revenue (Sum of completed payments)
            const [revenueResult] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status = ?', ['completed']);
            const totalRevenue = revenueResult[0].total || 0;

            // 3. Active Classes (Live status)
            // Checking logical "Active" definition. UI says "Active Classes". 
            // We'll count classes that are currently 'live'.
            // 3. Active Classes (Live status)
            const [classesResult] = await db.query('SELECT COUNT(*) as count FROM live_classes WHERE status = ?', ['live']);
            const activeClasses = classesResult[0].count;

            // 4. Pending Users (Waiting for approval)
            const [pendingResult] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = ?', [0]); // Assuming 0 is false
            const pendingUsers = pendingResult[0].count;

            res.json({
                totalUsers,
                totalRevenue,
                activeClasses,
                pendingUsers
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
            res.status(500).json({ message: 'Server error fetching dashboard stats' });
        }
    }
};

module.exports = dashboardController;
