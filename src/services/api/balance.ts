import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface UserBalance {
  amount: number;
  currency: string;
  lastUpdated: string;
  error?: boolean;
  errorMessage?: string;
}

export const getUserBalance = async (userId: string): Promise<UserBalance> => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${API_URL}/api/users/balance/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error getting user balance:', error);
    
    let errorMessage = 'Failed to get balance';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    return {
      amount: 0,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
      error: true,
      errorMessage: errorMessage
    };
  }
};

export const updateUserBalance = async (userId: string, amount: number): Promise<number> => {
  try {
    const token = await getAuthToken();
    const response = await axios.put(
      `${API_URL}/api/users/balance`,
      { userId, amount },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data.newBalance;
  } catch (error: any) {
    console.error('Error updating user balance:', error);
    
    // Check for specific error messages
    if (error.response?.data?.error?.includes('Insufficient balance')) {
      const insufficientError = new Error(error.response.data.error);
      insufficientError.name = 'InsufficientBalanceError';
      throw insufficientError;
    }
    
    throw new Error(error.response?.data?.error || 'Failed to update balance');
  }
}; 