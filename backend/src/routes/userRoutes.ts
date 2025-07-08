import express from 'express';
import { getUserProfile, getUserBalance, updateUserBalance, captureUserIP } from '../controllers/userController.js';
import { getUserPrizes } from '../controllers/megaTestController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protected user routes
router.use(authenticateUser);

router.get('/profile/:userId', getUserProfile);
router.get('/balance/:userId', getUserBalance);
router.put('/balance', updateUserBalance);
router.post('/capture-ip', captureUserIP);
router.get('/prizes/:userId', getUserPrizes);

export default router;