import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const createApiInstance = async () => {
  try {
    // Check for custom admin auth first
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      const parsedAuth = JSON.parse(adminAuth);
      if (parsedAuth && parsedAuth.isAdmin) {
        // Use the token from admin login response
        return axios.create({
          baseURL: API_URL,
          headers: {
            'Authorization': `Bearer ${parsedAuth.token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Fall back to Firebase auth
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const token = await user.getIdToken();
    
    return axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error creating API instance:', error);
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
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get all user balances
export const getAllBalances = async (): Promise<UserBalance[]> => {
  try {
    const api = await createApiInstance();
    const response = await api.get('/admin/balances');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<void> => {
  try {
    const api = await createApiInstance();
    await api.patch(`/admin/users/${userId}/role`, { role });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    throw error;
  }
}; 