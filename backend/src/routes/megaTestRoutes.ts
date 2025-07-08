import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  submitPrizeClaim,
  getMegaTestLeaderboard,
  getMegaTests,
  getMegaTestById,
  getMegaTestPrizes,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest,
  submitMegaTestResult
} from '../controllers/megaTestController.js';

const router = express.Router();

router.post('/:megaTestId/prize-claims', authenticateUser, submitPrizeClaim);
router.get('/:megaTestId/leaderboard', authenticateUser, getMegaTestLeaderboard);

router.get('/', authenticateUser, getMegaTests);
router.get('/:megaTestId', authenticateUser, getMegaTestById);
router.get('/:megaTestId/prizes', authenticateUser, getMegaTestPrizes);
router.post('/:megaTestId/register', authenticateUser, registerForMegaTest);
router.get('/:megaTestId/is-registered', authenticateUser, isUserRegistered);
router.get('/:megaTestId/has-submitted', authenticateUser, hasUserSubmittedMegaTest);
router.post('/:megaTestId/submit', authenticateUser, submitMegaTestResult);

export default router;
