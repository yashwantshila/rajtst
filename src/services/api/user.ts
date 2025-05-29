import axios from 'axios';
import { getAuthToken } from './auth';
import { getAuth } from 'firebase/auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajtst-1074455492364.asia-south1.run.app';

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
    
    const response = await axios.get(`${API_URL}/api/users/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user profile:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Handle token expiration
    if (error.response?.data?.requiresRefresh) {
      try {
        // Force refresh token
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          
          // Retry the request with new token
          const response = await axios.get(`${API_URL}/api/users/profile/${userId}`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
          return response.data;
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        throw new Error('Failed to refresh authentication');
      }
    }
    
    // Handle authentication required
    if (error.response?.data?.requiresAuth) {
      throw new Error('Authentication required');
    }
    
    throw error;
  }
}; 