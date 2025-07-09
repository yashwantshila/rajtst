import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  submitPrizeClaim,
  getMegaTestLeaderboard,
  getMegaTests,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest,
  getMegaTestById,
  getMegaTestPrizes,
  submitMegaTestResult
} from '../controllers/megaTestController.js';

const router = express.Router();

router.get('/', getMegaTests);
router.get('/:megaTestId/leaderboard', getMegaTestLeaderboard);
router.get('/:megaTestId', getMegaTestById);
router.get('/:megaTestId/prizes', getMegaTestPrizes);

router.use(authenticateUser);
router.post('/:megaTestId/register', registerForMegaTest);
router.get('/:megaTestId/registration-status/:userId', isUserRegistered);
router.get('/:megaTestId/submission-status/:userId', hasUserSubmittedMegaTest);
router.post('/:megaTestId/submit', submitMegaTestResult);
router.post('/:megaTestId/prize-claims', submitPrizeClaim);

export default router;
