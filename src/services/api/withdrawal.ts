import axios from 'axios';
import { getAuthToken } from './auth';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userName?: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  upiId: string;
  status: 'pending' | 'completed' | 'rejected';
  requestDate: string;
  completionDate?: string;
  notes?: string;
  userExpiryDate?: string;
  deletedForAdmin?: boolean;
}

export const MINIMUM_WITHDRAWAL_AMOUNT = 50;
export const WITHDRAWAL_FEE_PERCENTAGE = 0.1;

export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  upiId: string,
  userName?: string
): Promise<string> => {
  const token = await getAuthToken();
  const response = await axios.post(
    `${API_URL}/api/withdrawals`,
    { userId, amount, upiId, userName },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.id;
};

export const getUserWithdrawalRequests = async (
  userId: string
): Promise<WithdrawalRequest[]> => {
  const token = await getAuthToken();
  const response = await axios.get(`${API_URL}/api/withdrawals/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// ----- Admin APIs -----
const createAdminApi = async () => {
  const token = await refreshAdminToken();
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getAllWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  const api = await createAdminApi();
  const response = await api.get('/api/withdrawals/admin');
  return response.data;
};

export const updateWithdrawalStatus = async (
  id: string,
  status: 'completed' | 'rejected',
  notes?: string
): Promise<void> => {
  const api = await createAdminApi();
  await api.put(`/api/withdrawals/admin/${id}/status`, { status, notes });
};

export const deleteWithdrawalRequest = async (id: string): Promise<void> => {
  const api = await createAdminApi();
  await api.delete(`/api/withdrawals/admin/${id}`);
};
