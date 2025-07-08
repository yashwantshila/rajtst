import axios from 'axios';
import { getAuthTokenOptional, getAuthToken } from './auth';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface MegaTest {
  id: string;
  title: string;
  description: string;
  [key: string]: any;
}

export const getMegaTests = async (): Promise<MegaTest[]> => {
  const token = await getAuthTokenOptional();
  const res = await axios.get(`${API_URL}/api/mega-tests`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined

  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/mega-tests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const registerForMegaTest = async (
  megaTestId: string,
  username: string
): Promise<void> => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/mega-tests/${megaTestId}/register`,
    { username },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
