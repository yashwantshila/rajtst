import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface MegaTest {
  id: string;
  title: string;
  description: string;
  entryFee: number;
  registrationStartTime: string;
  registrationEndTime: string;
  testStartTime: string;
  testEndTime: string;
  resultTime: string;
  totalQuestions: number;
  timeLimit: number;
}

export const getMegaTests = async (): Promise<MegaTest[]> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getMegaTestById = async (id: string) => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const registerForMegaTest = async (id: string, userId: string, username: string, email: string) => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/megatests/${id}/register`,
    { userId, username, email },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const submitMegaTestResult = async (id: string, userId: string, score: number, completionTime: number) => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/megatests/${id}/submit`,
    { userId, score, completionTime },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const getMegaTestLeaderboard = async (id: string) => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests/${id}/leaderboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getMegaTestPrizePool = async (id: string) => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests/${id}/prizepool`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.prizePool as number;
};

export const getMegaTestParticipantCount = async (id: string) => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests/${id}/participants-count`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.count as number;
};

export const getMegaTestParticipants = async (id: string) => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/megatests/${id}/participants`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
