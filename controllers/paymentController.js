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
                // Get student's grade and selected course
                const [userInfo] = await db.query('SELECT grade, selected_subject_id FROM users WHERE id = ?', [userId]);
                if (userInfo.length > 0 && userInfo[0].grade) {
                    const grade = userInfo[0].grade;
                    const selectedSubjectId = userInfo[0].selected_subject_id;

                    // Get subjects: If selectedSubjectId is present, ONLY get that subject.
                    // Otherwise, get all subjects for the grade (for school students).
                    let subjectQuery = `
                        SELECT s.id FROM subjects s 
                        WHERE s.grade = ? 
                        OR s.grade LIKE ?
                        OR s.class_id = (SELECT id FROM classes WHERE name = ? OR name LIKE ? LIMIT 1)
                    `;
                    let subjectParams = [grade, `${grade}%`, grade, `${grade}%`];

                    if (selectedSubjectId) {
                        subjectQuery += ' AND s.id = ?';
                        subjectParams.push(selectedSubjectId);
                    }

                    const [subjects] = await db.query(subjectQuery, subjectParams);

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
                    console.log(`[AutoAllocation] Allocated student ${userId} to batches for grade ${grade} (Specific Subject: ${selectedSubjectId || 'All'})`);
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
