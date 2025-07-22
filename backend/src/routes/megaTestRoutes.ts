import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  getMegaTestLeaderboard,
  getMegaTests,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest,
  getMegaTestById,
  getMegaTestPrizes,
  getMegaTestParticipantCount,
  submitMegaTestResult,
  startMegaTest
} from '../controllers/megaTestController.js';

const router = express.Router();

router.get('/', getMegaTests);
router.get('/:megaTestId/leaderboard', getMegaTestLeaderboard);
router.get('/:megaTestId/participant-count', getMegaTestParticipantCount);
router.get('/:megaTestId', authenticateUser, getMegaTestById);
router.get('/:megaTestId/prizes', getMegaTestPrizes);

router.use(authenticateUser);
router.post('/:megaTestId/register', registerForMegaTest);
router.get('/:megaTestId/registration-status/:userId', isUserRegistered);
router.get('/:megaTestId/submission-status/:userId', hasUserSubmittedMegaTest);
router.post('/:megaTestId/start', startMegaTest);
router.post('/:megaTestId/submit', submitMegaTestResult);

export default router;
