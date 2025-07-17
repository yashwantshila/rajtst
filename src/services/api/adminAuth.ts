import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdminUser {
  email: string;
  isAdmin: boolean;
  token: string;
}

const ADMIN_STORAGE_KEY = 'admin_session';

export const loginAdmin = async (email: string, password: string): Promise<AdminUser> => {
  const response = await axios.post(`${API_URL}/api/auth/admin/login`, { email, password });
  const admin: AdminUser = {
    email: response.data.email,
    isAdmin: response.data.isAdmin,
    token: response.data.token,
  };
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
  return admin;
};

export const logoutAdmin = async (): Promise<void> => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};

export const getCurrentAdmin = (): AdminUser | null => {
  const data = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AdminUser;
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
