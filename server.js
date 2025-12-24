const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // In production, replace with client URL
        methods: ["GET", "POST"]
    }
});

// Make socket.io available globally
app.locals.io = io;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection Pool
const dbDetails = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Auto-setup database and tables on startup
const { setup } = require('./setupDb');

(async () => {
    try {
        await setup();
        console.log('✓ Database and tables ready');
    } catch (err) {
        console.error('Database setup failed:', err);
        process.exit(1);
    }
})();

const pool = mysql.createPool(dbDetails);

// Initialize Reminder Service
const { startReminderService } = require('./services/reminderService');
startReminderService(pool);

// Make pool available to routes
app.locals.db = pool;

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const classRoutes = require('./routes/classRoutes');
const noteRoutes = require('./routes/noteRoutes');
const examRoutes = require('./routes/examRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const batchRoutes = require('./routes/batchRoutes');

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
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superInstructorRoutes = require('./routes/superInstructorRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const studentRoutes = require('./routes/studentRoutes');

app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-instructor', superInstructorRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/student', studentRoutes);

// Routes (Placeholders for now)
app.get('/', (req, res) => {
    res.send('EduTalks API is running');
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_class', async (data) => {
        // data can be classId or { classId, userId }
        const classId = typeof data === 'object' ? data.classId : data;
        const userId = typeof data === 'object' ? data.userId : null;

        const room = String(classId);
        socket.join(room);
        console.log(`[Socket] User ${socket.id} joined room: ${room}`);

        if (userId) {
            // Log attendance join
            try {
                const userName = typeof data === 'object' ? data.userName : 'Unknown';
                const role = typeof data === 'object' ? data.role : 'Student';

                const db = app.locals.db;
                await db.query('INSERT INTO live_class_attendance (class_id, user_id) VALUES (?, ?)', [classId, userId]);
                socket.userId = userId;
                socket.classId = classId;
                socket.userName = userName;
                socket.role = role;

                // Notify others with full user info
                socket.to(room).emit('user_joined', { userId, userName, role });

                // Send current room members list to the new user
                const socketsInRoom = await io.in(room).fetchSockets();
                const members = socketsInRoom.map(s => ({
                    userId: s.userId,
                    userName: s.userName,
                    role: s.role
                })).filter(u => u.userId); // Ensure we only send users with an ID

                socket.emit('current_users', members);
            } catch (err) {
                console.error("Attendance Log Error:", err);
            }
        }
    });

    socket.on('send_message', (data) => {
        const room = String(data.classId);
        io.to(room).emit('receive_message', data);
    });

    socket.on('toggle_chat', (data) => {
        // data: { classId, locked }
        io.to(String(data.classId)).emit('chat_status', { locked: data.locked });
    });

    socket.on('toggle_audio', (data) => {
        // data: { classId, locked }
        io.to(String(data.classId)).emit('audio_status', { locked: data.locked });
    });

    socket.on('toggle_video', (data) => {
        // data: { classId, locked }
        io.to(String(data.classId)).emit('video_status', { locked: data.locked });
    });

    socket.on('raise_hand', (data) => {
        io.to(String(data.classId)).emit('hand_raised', data);
    });

    socket.on('lower_hand', (data) => {
        io.to(String(data.classId)).emit('hand_lowered', data);
    });

    socket.on('approve_hand', (data) => {
        // data: { classId, studentId }
        io.to(String(data.classId)).emit('hand_approved', data);
    });

    socket.on('toggle_screen', (data) => {
        // data: { classId, locked }
        io.to(String(data.classId)).emit('screen_status', { locked: data.locked });
    });

    socket.on('toggle_whiteboard', (data) => {
        // data: { classId, locked }
        io.to(String(data.classId)).emit('whiteboard_status', { locked: data.locked });
    });

    socket.on('toggle_whiteboard_visibility', (data) => {
        // data: { classId, show }
        io.to(String(data.classId)).emit('whiteboard_visibility', { show: data.show });
    });

    socket.on('whiteboard_draw', (data) => {
        // data: { classId, x, y, prevX, prevY, color, lineWidth }
        socket.to(String(data.classId)).emit('whiteboard_draw', data);
    });

    socket.on('whiteboard_clear', (data) => {
        // data: { classId }
        socket.to(String(data.classId)).emit('whiteboard_clear');
    });

    socket.on('send_reaction', (data) => {
        // data: { classId, reaction, studentName }
        io.to(String(data.classId)).emit('receive_reaction', data);
    });

    socket.on('share_screen', (data) => {
        // data: { classId, studentId, allowed }
        io.to(String(data.classId)).emit('screen_share_status', data);
    });

    socket.on('request_screen_share', (data) => {
        // data: { classId, studentId, studentName }
        io.to(String(data.classId)).emit('receive_screen_share_request', data);
    });

    socket.on('approve_screen_share', (data) => {
        // data: { classId, studentId }
        io.to(String(data.classId)).emit('screen_share_approved', data);
    });

    socket.on('lower_all_hands', (classId) => {
        io.to(String(classId)).emit('all_hands_lowered');
    });

    socket.on('disconnect', async () => {
        if (socket.userId && socket.classId) {
            try {
                const db = app.locals.db;
                await db.query('UPDATE live_class_attendance SET left_at = NOW() WHERE class_id = ? AND user_id = ? AND left_at IS NULL', [socket.classId, socket.userId]);
                socket.to(String(socket.classId)).emit('user_left', { userId: socket.userId });
            } catch (err) {
                console.error("Attendance Exit Log Error:", err);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});