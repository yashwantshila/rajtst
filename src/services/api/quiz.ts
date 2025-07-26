import axios from 'axios';
import { getAuthToken, getOptionalAuthToken } from './auth';

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
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/quiz/categories`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const getSubCategories = async (categoryId: string): Promise<SubCategory[]> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(
    `${API_URL}/api/quiz/categories/${categoryId}/sub-categories`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};

export const getQuizzesByCategory = async (
  category: string,
  subcategory?: string
): Promise<Quiz[]> => {
  const token = await getOptionalAuthToken();
  const url = subcategory
    ? `${API_URL}/api/quiz/categories/${category}/subcategories/${subcategory}/quizzes`
    : `${API_URL}/api/quiz/categories/${category}/quizzes`;
  const res = await axios.get(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};

export const getQuizById = async (quizId: string): Promise<Quiz & { questions: QuizQuestion[] }> => {
  const token = await getOptionalAuthToken();
  const res = await axios.get(`${API_URL}/api/quiz/quizzes/${quizId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
};
