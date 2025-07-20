import axios from 'axios';
import { getAuthToken, getOptionalAuthToken } from './auth';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface DailyChallenge {
  id: string;
  title: string;
  reward: number;
  requiredCorrect: number;
  timeLimit: number;
  description?: string;
  active: boolean;
  practiceUrl?: string;
}

export interface ChallengeStatus {
  userId: string;
  challengeId: string;
  date: string;
  correctCount: number;
  attemptedQuestions: string[];
  completed: boolean;
  won: boolean;
  startedAt: string;
  completedAt?: string;
  timeLimit: number;
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
  timeLimit: number,
  description?: string,
  practiceUrl?: string,
): Promise<string> => {
  const api = await createAdminApi();
  const res = await api.post('/api/daily-challenges', {
    title,
    reward,
    requiredCorrect,
    timeLimit,
    description,
    practiceUrl,
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
export const adminAddBulkQuestions = async (
  challengeId: string,
  questions: { text: string; options: string[]; correctAnswer: string }[],
): Promise<void> => {
  const api = await createAdminApi();
  await api.post(`/api/daily-challenges/${challengeId}/questions/bulk`, { questions });
};

export const adminUpdateQuestion = async (
  challengeId: string,
  questionId: string,
  text: string,
  options: string[],
  correctAnswer: string,
): Promise<void> => {
  const api = await createAdminApi();
  await api.put(`/api/daily-challenges/${challengeId}/questions/${questionId}`, {
    text,
    options,
    correctAnswer,
  });
};

export const adminDeleteQuestion = async (
  challengeId: string,
  questionId: string,
): Promise<void> => {
  const api = await createAdminApi();
  await api.delete(`/api/daily-challenges/${challengeId}/questions/${questionId}`);
};

export const adminDeleteChallenge = async (challengeId: string): Promise<void> => {
  const api = await createAdminApi();
  await api.delete(`/api/daily-challenges/${challengeId}`);
};

export const adminGetQuestionCount = async (challengeId: string): Promise<number> => {
  const api = await createAdminApi();
  const res = await api.get(`/api/daily-challenges/${challengeId}/questions/count`);
  return res.data.count;
};

export const adminGetQuestions = async (
  challengeId: string,
): Promise<{ id: string; text: string; options: string[]; correctAnswer: string }[]> => {
  const api = await createAdminApi();
  const res = await api.get(`/api/daily-challenges/${challengeId}/questions`);
  return res.data;
};
