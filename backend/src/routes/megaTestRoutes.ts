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

router.get('/', getMegaTests);
router.get('/:megaTestId/leaderboard', getMegaTestLeaderboard);

router.use(authenticateUser);
router.post('/:megaTestId/register', registerForMegaTest);
router.get('/:megaTestId/registration-status/:userId', isUserRegistered);
router.get('/:megaTestId/submission-status/:userId', hasUserSubmittedMegaTest);
router.post('/:megaTestId/prize-claims', submitPrizeClaim);

export default router;
