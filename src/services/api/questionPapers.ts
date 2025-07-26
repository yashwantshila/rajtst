import axios from 'axios';
import { getAuthToken, getOptionalAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface QuestionPaperCategory {
  id: string;
  title: string;
  description: string;
}

export interface QuestionPaper {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  year: number;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export const getQuestionPaperCategories = async (): Promise<QuestionPaperCategory[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/pyqs/categories`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const getQuestionPapersByCategory = async (categoryId: string): Promise<QuestionPaper[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(
    `${API_URL}/api/pyqs/categories/${categoryId}/papers`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};

export const downloadQuestionPaper = async (fileUrl: string): Promise<Blob> => {
  const res = await axios.get(fileUrl, {
    responseType: 'blob'
  });
  return res.data;
};
