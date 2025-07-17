import axios from 'axios';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface BlogPost {
  title: string;
  slug: string;
  content: string;
  pdfUrl?: string;
  createdAt: string;
}

export const fetchBlogPosts = async (): Promise<BlogPost[]> => {
  const res = await axios.get(`${API_URL}/api/blog-posts`);
  return res.data;
};

export const fetchBlogPost = async (slug: string): Promise<BlogPost> => {
  const res = await axios.get(`${API_URL}/api/blog-posts/${slug}`);
  return res.data;
};

export const createBlogPost = async (title: string, pdfUrl?: string): Promise<void> => {
  const token = await refreshAdminToken();
  await axios.post(
    `${API_URL}/api/blog-posts`,
    { title, pdfUrl },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
