import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getMegaTests, registerForMegaTest } from '../controllers/megaTestController.js';

const router = express.Router();

// Listing mega tests should be allowed without authentication so that
// unauthenticated visitors can view upcoming tests.
router.get('/', getMegaTests);
router.post('/:megaTestId/register', authenticateUser, registerForMegaTest);

export default router;
