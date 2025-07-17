import axios from 'axios';
import { getOptionalAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface HeaderAd {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  text?: string;
}

export const getHeaderAds = async (): Promise<HeaderAd[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/header-ads`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const createHeaderAd = async (data: Omit<HeaderAd, 'id'>): Promise<HeaderAd> => {
  const token = await getOptionalAuthToken();
  const res = await axios.post(`${API_URL}/api/header-ads`, data, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const updateHeaderAd = async (id: string, data: Partial<Omit<HeaderAd, 'id'>>): Promise<HeaderAd> => {
  const token = await getOptionalAuthToken();
  const res = await axios.put(`${API_URL}/api/header-ads/${id}`, data, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const deleteHeaderAd = async (id: string): Promise<void> => {
  const token = await getOptionalAuthToken();
  await axios.delete(`${API_URL}/api/header-ads/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};
