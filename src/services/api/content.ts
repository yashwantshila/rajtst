import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const getContent = async (slug: string): Promise<{ content: string }> => {
  const res = await axios.get(`${API_URL}/api/content/${slug}`);
  return res.data;
};
