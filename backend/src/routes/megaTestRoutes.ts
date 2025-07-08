import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getMegaTests, registerForMegaTest } from '../controllers/megaTestController.js';

const router = express.Router();

router.get('/', authenticateUser, getMegaTests);
router.post('/:megaTestId/register', authenticateUser, registerForMegaTest);

export default router;
