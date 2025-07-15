import axios from 'axios';
import { getAuthToken } from './auth';

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
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/question-papers/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuestionPapersByCategory = async (categoryId: string): Promise<QuestionPaper[]> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/question-papers/categories/${categoryId}/papers`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const downloadQuestionPaper = async (paperId: string): Promise<Blob> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/question-papers/papers/${paperId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  return res.data;
};
