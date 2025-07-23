import {
  getAuth,
  signInWithCustomToken,
  signOut,
  onIdTokenChanged,
} from 'firebase/auth';
import axios from 'axios';
import { app } from '../firebase/config';
import { setCookie, getCookie, removeCookie } from '@/utils/cookies';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

interface RegisterResponse extends LoginResponse {}

// Token refresh interval (in milliseconds)
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes

// Function to start token refresh interval
const startTokenRefresh = () => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (user) {
    // Refresh token immediately
    user.getIdToken(true);
    
    // Set up interval to refresh token
    setInterval(async () => {
      try {
        await user.getIdToken(true);
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }, TOKEN_REFRESH_INTERVAL);
  }
};

// Function to stop token refresh interval
export const stopTokenRefresh = () => {
  // Implementation needed
};

// Set up token refresh listener
const auth = getAuth(app);
onIdTokenChanged(auth, (user) => {
  if (user) {
    startTokenRefresh();
  } else {
    stopTokenRefresh();
  }
});

export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    const { token, user } = response.data as LoginResponse;

    const auth = getAuth(app);
    const userCredential = await signInWithCustomToken(auth, token);
    const idToken = await userCredential.user.getIdToken(true);

    setCookie(
      'user',
      JSON.stringify({
        id: userCredential.user.uid,
        email: user.email,
        username: user.username,
      })
    );

    startTokenRefresh();

    return {
      token: idToken,
      user: {
        id: userCredential.user.uid,
        email: user.email,
        username: user.username,
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    const msg =
      error.response?.data?.error || error.message || 'Failed to login';
    throw new Error(msg);
  }
};

export const registerUser = async (
  email: string,
  password: string,
  username: string
) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      username,
    });

    const { token, user } = response.data as RegisterResponse;

    const auth = getAuth(app);
    const userCredential = await signInWithCustomToken(auth, token);
    const idToken = await userCredential.user.getIdToken(true);

    setCookie(
      'user',
      JSON.stringify({
        id: userCredential.user.uid,
        email: user.email,
        username: user.username,
      })
    );

    return {
      token: idToken,
      user: {
        id: userCredential.user.uid,
        email: user.email,
        username: user.username,
      },
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    const msg =
      error.response?.data?.error || error.message || 'Failed to register';
    throw new Error(msg);
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  await axios.post(`${API_URL}/auth/reset-password`, { email });
};

export const logoutUser = async () => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
    removeCookie('user');
    stopTokenRefresh();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = (): { id: string; email: string; username: string } | null => {
  const userStr = getCookie('user');
  if (!userStr) return null;
  return JSON.parse(userStr);
};

export const getAuthToken = async (): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) {
    console.error('No authenticated user found');
    throw new Error('No authenticated user');
  }
  
  try {
    // Force refresh the token to ensure it's valid
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error('Failed to get authentication token');
  }};

export const getOptionalAuthToken = async (): Promise<string | null> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};