import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';
import {
  createChallenge,
  addQuestion,
  addBulkQuestions,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  deleteChallenge,
  getQuestionCount,
  getDailyChallenges,
  startChallenge,
  getChallengeStatus,
  getNextQuestion,
  submitAnswer,
  forfeitChallenge,
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
router.post('/:challengeId/forfeit', forfeitChallenge);

// Admin actions
router.use(verifyFirebaseAdmin);
router.post('/', createChallenge);
router.post('/:challengeId/questions', addQuestion);
router.post('/:challengeId/questions/bulk', addBulkQuestions);
router.get('/:challengeId/questions', getQuestions);
router.get('/:challengeId/questions/count', getQuestionCount);
router.put('/:challengeId/questions/:questionId', updateQuestion);
router.delete('/:challengeId/questions/:questionId', deleteQuestion);
router.delete('/:challengeId', deleteChallenge);

export default router;
