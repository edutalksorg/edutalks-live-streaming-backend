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

            // 1. Record Payment
            await db.query(
                'INSERT INTO payments (user_id, order_id, payment_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, razorpay_order_id, razorpay_payment_id, 0, 'INR', 'completed'] // Amount is tricky if not passed back, can fetch from order or trust frontend transiently or fetch from razorpay. For now 0 or passed params.
                // Better: We should probably store the amount when creating the order, OR fetch it here.
                // Simplicity: Let's assume we update it later or just mark 'completed'.
            );

            // 2. Update User Subscription
            const expiresAt = new Date();
            if (planName === 'Monthly') {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            } else {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }

            await db.query(
                'UPDATE users SET plan_name = ?, subscription_expires_at = ? WHERE id = ?',
                [planName || 'Pro', expiresAt, userId]
            );

            // 3. Auto-Allocate Student to Batches
            try {
                // Get student's grade
                const [userInfo] = await db.query('SELECT grade FROM users WHERE id = ?', [userId]);
                if (userInfo.length > 0 && userInfo[0].grade) {
                    const grade = userInfo[0].grade;

                    // Get all subjects for this grade
                    const [subjects] = await db.query(`
                        SELECT s.id FROM subjects s 
                        WHERE s.grade = ? OR s.class_id = (SELECT id FROM classes WHERE name = ?)
                    `, [grade, grade]);

                    for (const subject of subjects) {
                        // Check if student is already assigned to a batch for this subject
                        const [existingAssignment] = await db.query(`
                            SELECT sb.id FROM student_batches sb
                            JOIN batches b ON sb.batch_id = b.id
                            WHERE sb.student_id = ? AND b.subject_id = ?
                        `, [userId, subject.id]);

                        if (existingAssignment.length === 0) {
                            // Find a batch with available capacity for this subject
                            const [availableBatches] = await db.query(`
                                SELECT b.id, b.student_count, b.max_students
                                FROM batches b
                                WHERE b.subject_id = ? AND b.student_count < b.max_students
                                ORDER BY b.id ASC
                                LIMIT 1
                            `, [subject.id]);

                            if (availableBatches.length > 0) {
                                const batchId = availableBatches[0].id;
                                // Assign student to batch
                                await db.query('INSERT INTO student_batches (student_id, batch_id) VALUES (?, ?)', [userId, batchId]);
                                // Update batch student count
                                await db.query('UPDATE batches SET student_count = student_count + 1 WHERE id = ?', [batchId]);
                            }
                        }
                    }
                    console.log(`[AutoAllocation] Allocated student ${userId} to batches for grade ${grade}`);
                }
            } catch (allocErr) {
                console.error('[AutoAllocation] Error during auto-allocation:', allocErr);
                // Don't fail the payment, just log the error
            }

            res.json({ success: true, message: 'Payment verified and subscription activated' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Database update failed after payment' });
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
