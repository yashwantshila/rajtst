import express from 'express';
import {
  getMegaTests,
  getMegaTestById,
  getMegaTestPrizes,
  createMegaTest,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest,
  submitMegaTestResult,
  getMegaTestLeaderboard,
  getMegaTestPrizePool,
  getMegaTestParticipantCount,
  getMegaTestParticipants
} from '../controllers/megaTestController.js';
import { authenticateUser } from '../middleware/auth.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';

const router = express.Router();

router.get('/', getMegaTests);
router.get('/:id', getMegaTestById);
router.get('/:id/prizes', getMegaTestPrizes);
router.get('/:id/prizepool', getMegaTestPrizePool);
router.get('/:id/participants-count', getMegaTestParticipantCount);
router.get('/:id/participants', getMegaTestParticipants);
router.get('/:id/is-registered/:userId', isUserRegistered);
router.get('/:id/is-submitted/:userId', hasUserSubmittedMegaTest);
router.get('/:id/leaderboard', getMegaTestLeaderboard);

router.post('/:id/register', authenticateUser, registerForMegaTest);
router.post('/:id/submit', authenticateUser, submitMegaTestResult);

// Admin-only actions
router.post('/', verifyFirebaseAdmin, createMegaTest);

export default router;
