import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { submitPrizeClaim, getMegaTestLeaderboard } from '../controllers/megaTestController.js';

const router = express.Router();

router.post('/:megaTestId/prize-claims', authenticateUser, submitPrizeClaim);
router.get('/:megaTestId/leaderboard', authenticateUser, getMegaTestLeaderboard);

export default router;
