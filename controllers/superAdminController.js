const superAdminController = {
    getDashboardStats: async (req, res) => {
        try {
            const db = req.app.locals.db;

            const [usersResult] = await db.query('SELECT COUNT(*) as count FROM users');
            const totalUsers = usersResult[0].count;

            const [revenueResult] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status = ?', ['completed']);
            const totalRevenue = revenueResult[0].total || 0;

            const [classesResult] = await db.query('SELECT COUNT(*) as count FROM live_classes WHERE status = ?', ['live']);
            const activeClasses = classesResult[0].count;

            const [pendingResult] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = ?', [0]);
            const pendingUsers = pendingResult[0].count;

            res.json({
                totalUsers,
                totalRevenue,
                activeClasses,
                pendingUsers
            });
        } catch (err) {
            console.error('Error fetching super admin stats:', err);
            res.status(500).json({ message: 'Server error fetching dashboard stats' });
        }
    }
};

module.exports = superAdminController;
