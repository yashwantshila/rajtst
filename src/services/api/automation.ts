import axios from 'axios';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const createAdminApi = async () => {
  const token = await refreshAdminToken();
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const startAutomation = async () => {
  const api = await createAdminApi();
  const res = await api.post('/api/automation/start');
  return res.data;
};

export const getAutomationStatus = async () => {
  const api = await createAdminApi();
  const res = await api.get('/api/automation/status');
  return res.data as { status: string; lastOutput: string };
};
