import { api } from '../api/config';

export const login = async (credentials: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
    // Clear any client-side storage
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login page
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const checkAuth = async () => {
  try {
    const response = await api.get('/api/auth/check');
    return response.data;
  } catch (error) {
    return false;
  }
}; 