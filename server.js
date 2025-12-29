const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173"
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
};

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Make socket.io available globally
app.locals.io = io;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection Pool
// Database Connection Pool
const dbDetails = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const classRoutes = require('./routes/classRoutes');
const noteRoutes = require('./routes/noteRoutes');
const examRoutes = require('./routes/examRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superInstructorRoutes = require('./routes/superInstructorRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Auto-setup database and tables on startup
const { setup } = require('./utils/dbSetup');

async function startServer() {
    try {
        // 1. Initialize Database
        await setup();
        console.log('✓ Database and tables ready');

        // 2. Create Pool
        const pool = mysql.createPool(dbDetails);
        app.locals.db = pool;

        // 3. Initialize Services
        const { startReminderService } = require('./services/reminderService');
        startReminderService(pool);

        const { startNotificationService } = require('./services/notificationService');
        startNotificationService(pool);

        const { startTournamentStatusService } = require('./services/tournamentStatusService');
        startTournamentStatusService(pool);

        // 4. Configure Routes
        // Serve uploaded files
        app.use('/uploads', express.static('uploads'));

        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/classes', classRoutes);
        app.use('/api/notes', noteRoutes);
        app.use('/api/exams', examRoutes);
        app.use('/api/tournaments', tournamentRoutes);
        app.use('/api/payments', paymentRoutes);
        app.use('/api/batches', batchRoutes);

        app.use('/api/super-admin', superAdminRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/super-instructor', superInstructorRoutes);
        app.use('/api/instructor', instructorRoutes);
        app.use('/api/student', studentRoutes);

        // Default Route
        app.get('/', (req, res) => {
            res.send('EduTalks API is running');
        });

        // 5. Start Server
        const PORT = process.env.PORT || 5000;
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Socket.IO Logic
io.on('connection', (socket) => {
    // ... (Socket logic remains same, it accesses app.locals.db which is set in startServer)
    console.log('User connected:', socket.id);

    socket.on('join_class', async (data) => {
        const classId = typeof data === 'object' ? data.classId : data;
        const userId = typeof data === 'object' ? data.userId : null;
        const classType = typeof data === 'object' ? data.classType : 'regular';
        const room = String(classId);
        socket.join(room);
        console.log(`[Socket] User ${socket.id} joined room: ${room} (${classType})`);

        if (userId) {
            try {
                const userName = typeof data === 'object' ? data.userName : 'Unknown';
                const role = typeof data === 'object' ? data.role : 'Student';
                const db = app.locals.db;
                if (db) {
                    if (classType === 'super') {
                        await db.query('INSERT INTO live_class_attendance (super_class_id, user_id, class_type) VALUES (?, ?, ?)', [classId, userId, 'super']);
                    } else {
                        await db.query('INSERT INTO live_class_attendance (class_id, user_id, class_type) VALUES (?, ?, ?)', [classId, userId, 'regular']);
                    }
                }
                socket.userId = userId;
                socket.classId = classId;
                socket.classType = classType;
                socket.userName = userName;
                socket.role = role;
                socket.to(room).emit('user_joined', { userId, userName, role });

                const socketsInRoom = await io.in(room).fetchSockets();
                const members = socketsInRoom.map(s => ({
                    userId: s.userId,
                    userName: s.userName,
                    role: s.role
                })).filter(u => u.userId);
                socket.emit('current_users', members);
            } catch (err) {
                console.error("Attendance Log Error:", err);
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        if (socket.userId && socket.classId) {
            const room = String(socket.classId);
            socket.to(room).emit('user_left', { userId: socket.userId });

            try {
                const db = app.locals.db;
                if (db) {
                    if (socket.classType === 'super') {
                        await db.query('UPDATE live_class_attendance SET left_at = CURRENT_TIMESTAMP WHERE super_class_id = ? AND user_id = ? AND left_at IS NULL', [socket.classId, socket.userId]);
                    } else {
                        await db.query('UPDATE live_class_attendance SET left_at = CURRENT_TIMESTAMP WHERE class_id = ? AND user_id = ? AND left_at IS NULL', [socket.classId, socket.userId]);
                    }
                }
            } catch (err) {
                console.error("Attendance Update Error on Disconnect:", err);
            }
        }
    });

    socket.on('send_message', (data) => {
        const room = String(data.classId);
        io.to(room).emit('receive_message', data);
    });

    socket.on('toggle_chat', (data) => { io.to(String(data.classId)).emit('chat_status', { locked: data.locked }); });
    socket.on('toggle_audio', (data) => { io.to(String(data.classId)).emit('audio_status', { locked: data.locked }); });
    socket.on('toggle_video', (data) => { io.to(String(data.classId)).emit('video_status', { locked: data.locked }); });
    socket.on('raise_hand', (data) => { io.to(String(data.classId)).emit('hand_raised', data); });
    socket.on('lower_hand', (data) => { io.to(String(data.classId)).emit('hand_lowered', data); });
    socket.on('approve_hand', (data) => { io.to(String(data.classId)).emit('hand_approved', data); });
    socket.on('toggle_screen', (data) => { io.to(String(data.classId)).emit('screen_status', { locked: data.locked }); });
    socket.on('toggle_whiteboard', (data) => { io.to(String(data.classId)).emit('whiteboard_status', { locked: data.locked }); });
    socket.on('toggle_whiteboard_visibility', (data) => { io.to(String(data.classId)).emit('whiteboard_visibility', { show: data.show }); });
    socket.on('whiteboard_draw', (data) => { socket.to(String(data.classId)).emit('whiteboard_draw', data); });
    socket.on('whiteboard_clear', (data) => { socket.to(String(data.classId)).emit('whiteboard_clear'); });
    socket.on('send_reaction', (data) => { io.to(String(data.classId)).emit('receive_reaction', data); });
    socket.on('share_screen', (data) => { io.to(String(data.classId)).emit('screen_share_status', data); });
    socket.on('request_screen_share', (data) => { io.to(String(data.classId)).emit('receive_screen_share_request', data); });
    socket.on('approve_screen_share', (data) => { io.to(String(data.classId)).emit('screen_share_approved', data); });
    socket.on('lower_all_hands', (classId) => { io.to(String(classId)).emit('all_hands_lowered'); });

    socket.on('disconnect', async () => {
        if (socket.userId && socket.classId) {
            try {
                const db = app.locals.db;
                if (db) {
                    await db.query('UPDATE live_class_attendance SET left_at = NOW() WHERE class_id = ? AND user_id = ? AND left_at IS NULL', [socket.classId, socket.userId]);
                }
                socket.to(String(socket.classId)).emit('user_left', { userId: socket.userId });
            } catch (err) {
                console.error("Attendance Exit Log Error:", err);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

startServer();