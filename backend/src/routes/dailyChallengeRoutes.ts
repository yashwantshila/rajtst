import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';
import {
  createChallenge,
  addQuestion,
  getDailyChallenges,
  startChallenge,
  getChallengeStatus,
  getNextQuestion,
  submitAnswer,
} from '../controllers/challengeController.js';

const router = express.Router();

// Public list of active challenges
router.get('/', getDailyChallenges);

// Authenticated user actions
router.use(authenticateUser);
router.post('/:challengeId/start', startChallenge);
router.get('/:challengeId/status', getChallengeStatus);
router.get('/:challengeId/question', getNextQuestion);
router.post('/:challengeId/answer', submitAnswer);

// Admin actions
router.use(verifyFirebaseAdmin);
router.post('/', createChallenge);
router.post('/:challengeId/questions', addQuestion);

export default router;
