import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import axios from 'axios';
import { app } from '../firebase/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export const loginAdmin = async (email: string, password: string): Promise<AdminUser> => {
  try {
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verify admin status via backend
    const token = await user.getIdToken();
    const api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` }
    });

    const status = await api.get('/api/admin/status');
    if (!status.data?.isAdmin) {
      await signOut(auth);
      throw new Error('You do not have admin privileges');
    }

    // Update role through backend
    await api.put(`/api/admin/users/${user.uid}/role`, { role: 'admin' });

    return {
      uid: user.uid,
      email: user.email || '',
      isAdmin: true
    };
  } catch (error: any) {
    // Handle specific Firebase auth errors without logging to console
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No admin account found with this email');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This admin account has been disabled');
    } else {
      throw new Error('Failed to login as admin');
    }
  }
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
  } catch (error) {
    console.error('Admin logout error:', error);
    throw new Error('Failed to logout');
  }
};

export const getCurrentAdmin = async (): Promise<AdminUser | null> => {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const token = await user.getIdToken();
    const response = await axios.get(`${API_URL}/api/admin/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.data?.isAdmin) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email || '',
      isAdmin: true
    };
  } catch (error) {
    console.error('Error getting current admin:', error);
    return null;
  }
};

export const refreshAdminToken = async (): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated admin user');
  }
  
  try {
    const token = await user.getIdToken(true); // Force refresh
    return token;
  } catch (error) {
    console.error('Error refreshing admin token:', error);
    throw new Error('Failed to refresh admin token');
  }
}; 