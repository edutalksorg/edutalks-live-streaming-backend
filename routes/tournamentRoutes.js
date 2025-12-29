const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// ===== INSTRUCTOR/ADMIN ROUTES =====

// Tournament CRUD
router.post(
    '/',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.createTournament
);

router.put(
    '/:id',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.updateTournament
);

router.delete(
    '/:id',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.deleteTournament
);

router.get(
    '/instructor/my-tournaments',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor'),
    tournamentController.getInstructorTournaments
);

router.get(
    '/:id/registrations',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.getRegisteredStudents
);

router.post(
    '/:id/publish-results',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.publishResults
);

router.get(
    '/:id/monitor',
    verifyToken,
    authorizeRoles('super_instructor', 'instructor', 'super_admin', 'admin'),
    tournamentController.getMonitoringData
);

// ===== STUDENT ROUTES =====

// List available tournaments (only from assigned instructors)
router.get(
    '/student/available',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.getStudentTournaments
);

// Register for tournament
router.post(
    '/:id/register',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.registerForTournament
);

// Check registration status
router.get(
    '/:id/registration-status',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.checkRegistrationStatus
);

// Exam execution
router.post(
    '/:id/start',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.startTournamentExam
);

router.post(
    '/:id/auto-save',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.autoSaveAnswers
);

router.post(
    '/:id/submit',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.submitTournamentExam
);

// Activity logging (anti-cheating)
router.post(
    '/:id/log-activity',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.logActivity
);

// Results and leaderboard
router.get(
    '/:id/leaderboard',
    verifyToken,
    tournamentController.getLeaderboard
);

router.get(
    '/:id/my-result',
    verifyToken,
    authorizeRoles('student'),
    tournamentController.getStudentResult
);

// ===== SHARED ROUTES =====

// Get single tournament details
router.get(
    '/:id',
    verifyToken,
    tournamentController.getTournamentById
);

// Get tournament levels (for dropdown selection)
router.get(
    '/levels/all',
    verifyToken,
    tournamentController.getTournamentLevels
);

module.exports = router;
