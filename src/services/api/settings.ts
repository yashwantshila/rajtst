import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface PageSeo {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
}

export interface SiteSettings {
  maintenanceMode?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  pageSeo?: Record<string, PageSeo>;
}

export const getSettings = async (): Promise<SiteSettings> => {
  const res = await axios.get(`${API_URL}/api/settings`);
  return res.data;
};
