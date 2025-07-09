import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  submitPrizeClaim,
  getMegaTestLeaderboard,
  getMegaTests,
  registerForMegaTest,
  isUserRegistered,
  hasUserSubmittedMegaTest
} from '../controllers/megaTestController.js';

const router = express.Router();

router.use(authenticateUser);
router.get('/', getMegaTests);
router.post('/:megaTestId/register', registerForMegaTest);
router.get('/:megaTestId/registration-status/:userId', isUserRegistered);
router.get('/:megaTestId/submission-status/:userId', hasUserSubmittedMegaTest);
router.post('/:megaTestId/prize-claims', submitPrizeClaim);
router.get('/:megaTestId/leaderboard', getMegaTestLeaderboard);

export default router;
