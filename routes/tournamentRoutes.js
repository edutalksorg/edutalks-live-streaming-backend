const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('super_instructor', 'instructor', 'super_admin'), tournamentController.createTournament);
router.get('/', verifyToken, tournamentController.getTournaments);
router.get('/student', verifyToken, authorizeRoles('student'), tournamentController.getStudentTournaments);
router.get('/leaderboard/:id', verifyToken, tournamentController.getLeaderboard);

module.exports = router;
