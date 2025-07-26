import axios from 'axios';
import { getAuthToken, getOptionalAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface PaidContent {
  id: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  pdfUrl: string;
  thumbnailUrl?: string;
}

export const getPaidContents = async (category?: string): Promise<PaidContent[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/paid-contents`, {
    params: category ? { category } : {},
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const getPurchasedContents = async (userId: string): Promise<PaidContent[]> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/users/purchased-content/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const purchaseContent = async (userId: string, contentId: string): Promise<void> => {
  const token = await getAuthToken();
  await axios.post(
    `${API_URL}/api/users/purchased-content/${userId}`,
    { contentId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const downloadContent = async (contentId: string): Promise<Blob> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/paid-contents/${contentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  return res.data;
};
