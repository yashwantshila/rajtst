import axios from 'axios';
import { refreshAdminToken } from './adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with auth token
const createApiInstance = async () => {
  try {
    // Get the Firebase auth token
    const token = await refreshAdminToken();
    
    const instance = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor to handle token expiration
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const newToken = await refreshAdminToken();
            
            // Update the request header with new token
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the request
            return instance(originalRequest);
          } catch (refreshError) {
            // If token refresh fails, redirect to login
            window.location.href = '/admin/login';
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return instance;
  } catch (error) {
    console.error('Error creating API instance:', error);
    // If the error is about session expiration, redirect to login
    if (error.message?.includes('session expired')) {
      window.location.href = '/admin/login';
    }
    throw error;
  }
};

export interface User {
  uid: string;
  email: string;
  username?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface UserBalance {
  userId: string;
  amount: number;
}

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const api = await createApiInstance();
    const response = await api.get('/api/admin/users');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to access this resource');
    }
    throw error;
  }
};

// Get all user balances
export const getAllBalances = async (): Promise<UserBalance[]> => {
  try {
    const api = await createApiInstance();
    const response = await api.get('/api/admin/balances');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to access this resource');
    }
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<void> => {
  try {
    const api = await createApiInstance();
    await api.put(`/api/admin/users/${userId}/role`, { uid: userId, role });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update user roles');
    }
    throw error;
  }
}; 