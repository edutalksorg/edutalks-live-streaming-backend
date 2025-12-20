const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
        <p><a href="http://localhost:5173/login">Login Here</a></p>
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
        <p><a href="http://localhost:5173/login">Login Here</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};

exports.sendLiveClassNotification = async (userEmail, name, subjectName, startTime) => {
    const subject = `Live Class Starting Soon: ${subjectName}`;
    const html = `
        <h3>Hello ${name},</h3>
        <p>This is a reminder that your live class for <b>${subjectName}</b> is starting soon.</p>
        <p><b>Start Time:</b> ${new Date(startTime).toLocaleString()}</p>
        <p>Please login to your dashboard to join the session.</p>
        <p><a href="http://localhost:5173/login">Join Now</a></p>
        <br/>
        <p>Best Regards,<br/>EduTalks Team</p>
    `;
    await sendEmail(userEmail, subject, html);
};
