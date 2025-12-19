exports.createOrder = async (req, res) => {
    const { amount, currency } = req.body;
    const userId = req.user.id; // Added by authMiddleware
    const orderId = 'order_' + Math.random().toString(36).substr(2, 9);

    try {
        await req.app.locals.db.query(
            'INSERT INTO payments (user_id, order_id, amount, currency, status) VALUES (?, ?, ?, ?, ?)',
            [userId, orderId, amount, currency || 'INR', 'pending']
        );
        res.json({ id: orderId, currency: currency || 'INR', amount: amount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Order creation failed' });
    }
};

exports.verifyPayment = async (req, res) => {
    const { orderId, paymentId, signature } = req.body;
    // In real app, verify signature here.

    try {
        await req.app.locals.db.query(
            'UPDATE payments SET status = ?, payment_id = ? WHERE order_id = ?',
            ['completed', paymentId, orderId]
        );
        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Payment verification failed' });
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const [payments] = await req.app.locals.db.query(`
            SELECT p.*, u.name as user_name, u.email as user_email 
            FROM payments p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `);
        res.json(payments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
