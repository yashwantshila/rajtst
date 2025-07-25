import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdsenseConfig {
  adClient?: string;
  adSlot?: string;
  enabled?: boolean;
}

export const getAdsenseConfig = async (): Promise<AdsenseConfig> => {
  const res = await axios.get(`${API_URL}/api/adsense`);
  return res.data;
};
