import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { submitPrizeClaim } from '../controllers/megaTestController.js';

const router = express.Router();

router.post('/:megaTestId/prize-claims', authenticateUser, submitPrizeClaim);

export default router;
