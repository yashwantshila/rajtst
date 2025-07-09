import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface UserPrize {
  megaTestId: string;
  megaTestTitle: string;
  prize: string;
  rank: number;
  claimStatus: 'unclaimed' | 'pending' | 'approved' | 'rejected' | 'claimed';
}

export const submitPrizeClaim = async (
  megaTestId: string,
  data: { name: string; mobile: string; address: string; prize: string; rank: number; ipAddress?: string; deviceId?: string }
): Promise<void> => {
  const token = await getAuthToken();
  await axios.post(`${API_URL}/api/mega-tests/${megaTestId}/prize-claims`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getUserPrizes = async (userId: string): Promise<UserPrize[]> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/users/${userId}/prizes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export interface MegaTestLeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
  submittedAt: string;
  completionTime: number;
}

export interface MegaTest {
  id: string;
  title: string;
  description: string;
  registrationStartTime: any;
  registrationEndTime: any;
  testStartTime: any;
  testEndTime: any;
  resultTime: any;
  totalQuestions: number;
  createdAt: any;
  updatedAt: any;
  status: 'upcoming' | 'registration' | 'ongoing' | 'completed';
  entryFee: number;
  timeLimit: number;
}

export const getMegaTestLeaderboard = async (
  megaTestId: string
): Promise<MegaTestLeaderboardEntry[]> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/mega-tests/${megaTestId}/leaderboard`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const getMegaTests = async (): Promise<MegaTest[]> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/mega-tests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const registerForMegaTest = async (
  megaTestId: string,
  userId: string,
  username: string,
  email: string
): Promise<void> => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/mega-tests/${megaTestId}/register`,
    { userId, username, email },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const isUserRegistered = async (
  megaTestId: string,
  userId: string
): Promise<boolean> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/mega-tests/${megaTestId}/registration-status/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.registered;
};

export const hasUserSubmittedMegaTest = async (
  megaTestId: string,
  userId: string
): Promise<boolean> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/mega-tests/${megaTestId}/submission-status/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.submitted;
};
