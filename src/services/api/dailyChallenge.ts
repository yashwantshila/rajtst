import axios from 'axios';
import { getAuthToken, getOptionalAuthToken } from './auth';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface DailyChallenge {
  id: string;
  title: string;
  reward: number;
  requiredCorrect: number;
  maxAttempts?: number;
  active: boolean;
}

export interface ChallengeStatus {
  userId: string;
  challengeId: string;
  date: string;
  correctCount: number;
  attemptCount: number;
  attemptedQuestions: string[];
  completed: boolean;
  won: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface ChallengeQuestion {
  id: string;
  text: string;
  options: string[];
}

export const getDailyChallenges = async (): Promise<DailyChallenge[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/daily-challenges`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
};

export const startChallenge = async (challengeId: string): Promise<void> => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/daily-challenges/${challengeId}/start`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
};

export const getChallengeStatus = async (
  challengeId: string,
): Promise<ChallengeStatus> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/daily-challenges/${challengeId}/status`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

export const getNextQuestion = async (
  challengeId: string,
): Promise<ChallengeQuestion> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/daily-challenges/${challengeId}/question`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

export const submitAnswer = async (
  challengeId: string,
  questionId: string,
  answer: string,
): Promise<ChallengeStatus & { correct: boolean }> => {
  const token = await getAuthToken();
  const res = await axios.post(
    `${API_URL}/api/daily-challenges/${challengeId}/answer`,
    { questionId, answer },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

// --- Admin APIs ---
const createAdminApi = async () => {
  const token = await refreshAdminToken();
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const adminCreateChallenge = async (
  title: string,
  reward: number,
  requiredCorrect: number,
): Promise<string> => {
  const api = await createAdminApi();
  const res = await api.post('/api/daily-challenges', {
    title,
    reward,
    requiredCorrect,
  });
  return res.data.id;
};

export const adminAddQuestion = async (
  challengeId: string,
  text: string,
  options: string[],
  correctAnswer: string,
): Promise<void> => {
  const api = await createAdminApi();
  await api.post(`/api/daily-challenges/${challengeId}/questions`, {
    text,
    options,
    correctAnswer,
  });
};
