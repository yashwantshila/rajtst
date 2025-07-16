import axios from 'axios';
import { setCookie, getCookie, removeCookie } from '@/utils/cookies';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdminUser {
  email: string;
  token: string;
  isAdmin: boolean;
}

export const loginAdmin = async (email: string, password: string): Promise<AdminUser> => {
  const response = await axios.post(`${API_URL}/api/auth/admin/login`, { email, password });
  const data = response.data;

  const adminInfo: AdminUser = {
    email: data.email,
    token: data.token,
    isAdmin: true
  };

  setCookie('adminAuth', JSON.stringify(adminInfo));
  return adminInfo;
};

export const logoutAdmin = async (): Promise<void> => {
  removeCookie('adminAuth');
};

export const getCurrentAdmin = (): AdminUser | null => {
  const stored = getCookie('adminAuth');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AdminUser;
  } catch {
    return null;
  }
};

export const refreshAdminToken = async (): Promise<string> => {
  const admin = getCurrentAdmin();
  if (!admin) {
    throw new Error('No authenticated admin user');
  }
  return admin.token;
};

export const checkAdminSession = async (): Promise<boolean> => {
  const admin = getCurrentAdmin();
  if (!admin) return false;
  try {
    await axios.get(`${API_URL}/api/auth/admin/check`, {
      headers: { Authorization: `Bearer ${admin.token}` }
    });
    return true;
  } catch {
    removeCookie('adminAuth');
    return false;
  }
};
