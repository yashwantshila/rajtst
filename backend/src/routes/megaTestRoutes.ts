import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';
import {
  getMegaTests,
  getMegaTestById,
  getMegaTestPrizes,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest,
  markMegaTestStarted,
  submitMegaTestResult,
  getMegaTestLeaderboard,
  createMegaTest,
  updateMegaTest,
  deleteMegaTest,
  getMegaTestPrizePool,
  getMegaTestParticipantCount,
  adminAddOrUpdateLeaderboardEntry,
  getMegaTestParticipants
} from '../controllers/megaTestController.js';

const router = express.Router();

router.get('/', getMegaTests);
router.get('/:id', getMegaTestById);
router.get('/:id/prizes', getMegaTestPrizes);
router.get('/:id/leaderboard', getMegaTestLeaderboard);
router.get('/:id/prize-pool', getMegaTestPrizePool);
router.get('/:id/participant-count', getMegaTestParticipantCount);
router.get('/:id/participants', getMegaTestParticipants);

router.post('/:id/register', authenticateUser, registerForMegaTest);
router.get('/:id/is-registered/:userId', authenticateUser, isUserRegistered);
router.get('/:id/has-submitted/:userId', authenticateUser, hasUserSubmittedMegaTest);
router.post('/:id/start', authenticateUser, markMegaTestStarted);
router.post('/:id/submit', authenticateUser, submitMegaTestResult);

router.post('/', verifyFirebaseAdmin, createMegaTest);
router.put('/:id', verifyFirebaseAdmin, updateMegaTest);
router.delete('/:id', verifyFirebaseAdmin, deleteMegaTest);
router.post('/:id/leaderboard', verifyFirebaseAdmin, adminAddOrUpdateLeaderboardEntry);

export default router;
