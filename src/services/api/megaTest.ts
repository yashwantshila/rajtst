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
