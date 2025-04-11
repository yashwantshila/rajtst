import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface UserProfile {
  username: string;
  email: string;
  balance: {
    amount: number;
    currency: string;
    lastUpdated?: string;
  };
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${API_URL}/users/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}; 