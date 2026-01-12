const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"EduTalks Admin" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

exports.sendEmail = sendEmail;

exports.sendRegistrationEmail = async (userEmail, name, role = 'Instructor') => {
    // Capitalize first letter
    const displayRole = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

    const subject = `Registration Received - EduTalks`;
    const html = `
        <h3>Welcome to EduTalks, ${name}!</h3>
        <p>Your registration for a <b>${displayRole}</b> account has been received.</p>
        <p>Your account is currently <b>pending approval</b> from the Super Admin.</p>
        <p>You will receive another email once your account is activated.</p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
    await sendEmail(userEmail, subject, html);
};

exports.sendStudentWelcomeEmail = async (userEmail, name) => {
    const subject = `Welcome to EduTalks!`;
    const html = `
        <h3>Welcome to EduTalks, ${name}!</h3>
        <p>Thank you for registering as a <b>Student</b>.</p>
        <p>Your account is <b>Active</b> and you can start learning immediately.</p>
        <p><a href="${loginUrl}">Login Here</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendAdminNotification = async (newUserName, newUserEmail, role = 'Instructor') => {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'mcsushma90@gmail.com';
    const displayRole = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

    const subject = `Action Required: New ${displayRole} Registration`;
    const html = `
        <h3>New ${displayRole} Registration</h3>
        <p>A new user has requested a <b>${displayRole}</b> account.</p>
        <p><b>Name:</b> ${newUserName}</p>
        <p><b>Email:</b> ${newUserEmail}</p>
        <p>Please login to the Super Admin dashboard to approve or reject this request.</p>
    `;
    await sendEmail(adminEmail, subject, html);
};

exports.sendApprovalEmail = async (userEmail, name, role = 'Instructor') => {
    const displayRole = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

    const subject = 'Account Approved - EduTalks';
    const html = `
        <h3>Congratulations, ${name}!</h3>
        <p>Your <b>${displayRole}</b> account has been <b>APPROVED</b>.</p>
        <p>You can now login to the platform and start managing your classes.</p>
        <p><a href="${loginUrl}">Login Here</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendLiveClassNotification = async (userEmail, name, subjectName, startTime) => {
    const subject = `Live Class Starting Soon: ${subjectName}`;
    const html = `
        <h3>Hello ${name},</h3>
        <p>This is a reminder that your live class for <b>${subjectName}</b> is starting now.</p>
        <p>Please login to your dashboard to join the session immediately.</p>
        <p><a href="${loginUrl}">Join Now</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendClassScheduledEmail = async (userEmail, name, subjectName, startTime, instructorName) => {
    const subject = `New Class Scheduled: ${subjectName}`;
    const html = `
        <h3>Hello ${name},</h3>
        <p>A new live class has been scheduled for <b>${subjectName}</b> by ${instructorName}.</p>
        <p><b>Start Time:</b> ${new Date(startTime).toLocaleString()}</p>
        <p>Make sure to be ready for the session!</p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendClassStartedEmail = async (userEmail, name, subjectName, instructorName, classId) => {
    const subject = `CLASS STARTED: ${subjectName}`;
    const joinUrl = classId ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/live/${classId}` : loginUrl;

    const html = `
        <h3>Hello ${name},</h3>
        <p>The live class for <b>${subjectName}</b> by ${instructorName} has just STARTED.</p>
        <p>Jump in now to participate!</p>
        <p><a href="${joinUrl}" style="background-color: #EE1D23; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Class Now</a></p>
        <p style="margin-top: 10px; font-size: 12px;">Or copy this link: <a href="${joinUrl}">${joinUrl}</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendClassReminderEmail = async (userEmail, name, subjectName, startTime, role = 'student', classId) => {
    const formattedTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reminderTime = new Date(new Date(startTime).getTime() - 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let joinUrl = loginUrl;
    if (classId) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        if (role === 'instructor') {
            joinUrl = `${baseUrl}/instructor/live/${classId}`;
        } else {
            joinUrl = `${baseUrl}/student/live/${classId}`;
        }
    }

    const subject = `Reminder: ${subjectName} starts in 5 minutes!`;
    const html = `
        <h3>Hello ${name},</h3>
        <p>This is a reminder that the session <b>${subjectName}</b> is scheduled for <b>${formattedTime}</b>.</p>
        <p>Please <b>meet at ${reminderTime}</b> to prepare for the session.</p>
        <p><a href="${joinUrl}" style="background-color: #EE1D23; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login & Join Now</a></p>
        <p style="margin-top: 10px; font-size: 12px;">Or copy this link: <a href="${joinUrl}">${joinUrl}</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendPasswordResetEmail = async (userEmail, name, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request - EduTalks';
    const html = `
        <h3>Hello ${name},</h3>
        <p>You requested to reset your password for your EduTalks account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in <b>1 hour</b>.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendDoubtNotification = async (instructorEmail, instructorName, studentName, subjectName, doubtTitle) => {
    const subject = `New Doubt Raised: ${doubtTitle}`;
    const html = `
        <h3>Hello ${instructorName},</h3>
        <p>A student (<b>${studentName}</b>) has raised a new doubt in your subject: <b>${subjectName}</b>.</p>
        <p><b>Topic:</b> ${doubtTitle}</p>
        <p>Please login to your dashboard to provide a solution.</p>
        <p><a href="${loginUrl}">Go to Dashboard</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(instructorEmail, subject, html);
};

exports.sendDoubtResolvedNotification = async (studentEmail, studentName, doubtTitle) => {
    const subject = `Doubt Resolved: ${doubtTitle}`;
    const html = `
        <h3>Hello ${studentName},</h3>
        <p>Your doubt regarding <b>${doubtTitle}</b> has been marked as <b>SOLVED</b> by your instructor.</p>
        <p>You can check the solution on your doubts hub.</p>
        <p><a href="${loginUrl}">View Solution</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(studentEmail, subject, html);
};


