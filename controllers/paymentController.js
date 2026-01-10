const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
    const { amount, currency, planName } = req.body;
    const userId = req.user.id;

    try {
        const options = {
            amount: amount * 100, // amount in smallest currency unit (paise)
            currency: currency || 'INR',
            receipt: 'order_rcptid_' + userId + '_' + Date.now(),
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        // Store preliminary info if needed, or just return order
        // We'll trust the verification step to record the actual payment

        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error("Razorpay Create Order Error:", err);
        res.status(500).json({ message: 'Order creation failed', error: err.message });
    }
};

exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;
    const userId = req.user.id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment is legit
        try {
            const db = req.app.locals.db;

            // 1. Fetch Order Details to get Amount
            console.log('[PaymentVerify] Fetching order details for:', razorpay_order_id);
            const orderInfo = await razorpay.orders.fetch(razorpay_order_id);
            console.log('[PaymentVerify] Order info:', JSON.stringify(orderInfo));

            const amountInPaise = orderInfo.amount;
            const amountInRupees = amountInPaise / 100;
            console.log('[PaymentVerify] Amount in paise:', amountInPaise, 'Amount in rupees:', amountInRupees);

            // 2. Record Payment
            console.log('[PaymentVerify] Inserting payment with amount:', amountInRupees);
            await db.query(
                'INSERT INTO payments (user_id, order_id, payment_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, razorpay_order_id, razorpay_payment_id, amountInRupees, 'INR', 'completed']
            );
            console.log('[PaymentVerify] Payment record inserted successfully');

            // 2. Update user subscription
            try {
                const expiresAt = new Date();
                if (planName === 'Monthly') {
                    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 Month
                } else {
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 Year
                }

                await db.query(
                    'UPDATE users SET plan_name = ?, subscription_expires_at = ? WHERE id = ?',
                    [planName || 'Pro', expiresAt, userId]
                );

                // 3. Auto-allocate student to relevant batches
                try {
                    const BatchAllocationService = require('../services/batchAllocationService');
                    const batchService = new BatchAllocationService(db);

                    // Fetch user data again to ensure we have the latest grade
                    const [users] = await db.query('SELECT grade FROM users WHERE id = ?', [userId]);
                    if (users.length > 0 && users[0].grade) {
                        await batchService.allocateStudentToBatches(userId, users[0].grade);
                    }
                } catch (allocErr) {
                    console.error('[AutoAllocation] Error:', allocErr);
                }

                res.json({ success: true, message: 'Payment verified and subscription activated' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Database update failed after payment' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Payment verification failed', error: err.message });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid formatting or signature mismatch' });
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
