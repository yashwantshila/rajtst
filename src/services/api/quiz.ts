import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  title: string;
  description: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: any[];
  correctAnswer: string;
}

export const getQuizCategories = async (): Promise<QuizCategory[]> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/quiz/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getSubCategories = async (categoryId: string): Promise<SubCategory[]> => {
  const token = await getAuthToken();
  const res = await axios.get(
    `${API_URL}/api/quiz/categories/${categoryId}/sub-categories`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const getQuizzesByCategory = async (
  categoryId: string,
  subcategoryId?: string
): Promise<Quiz[]> => {
  const token = await getAuthToken();
  const params = new URLSearchParams({ categoryId });
  if (subcategoryId) params.append('subcategoryId', subcategoryId);
  const res = await axios.get(`${API_URL}/api/quiz/quizzes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuizById = async (quizId: string): Promise<Quiz & { questions: QuizQuestion[] }> => {
  const token = await getAuthToken();
  const res = await axios.get(`${API_URL}/api/quiz/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
