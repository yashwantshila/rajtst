import axios from 'axios';
import { refreshToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with auth token
const createApiInstance = async () => {
  try {
    // Get the Firebase auth token
    const token = await refreshToken();
    
    const instance = axios.create({
      baseURL: API_URL,
      withCredentials: true, // Enable sending cookies with requests
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
            const newToken = await refreshToken();
            
            // Update the request header with new token
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the request
            return instance(originalRequest);
          } catch (refreshError) {
            // If token refresh fails, redirect to login
            window.location.href = '/login';
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
      window.location.href = '/login';
    }
    throw error;
  }
};

// Create and export the API instance
export const api = await createApiInstance(); 