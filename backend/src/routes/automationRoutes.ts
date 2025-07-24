import express from 'express';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';
import { startAutomation, getAutomationStatus } from '../controllers/automationController.js';

const router = express.Router();

router.use(verifyFirebaseAdmin);
router.post('/start', startAutomation);
router.get('/status', getAutomationStatus);

export default router;
