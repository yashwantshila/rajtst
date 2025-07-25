import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getAdsenseConfig = async (_req: Request, res: Response) => {
  try {
    const docRef = db.collection('config').doc('adsense');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.json({ enabled: false });
    }
    res.json(docSnap.data());
  } catch (error) {
    console.error('Error fetching adsense config:', error);
    res.status(500).json({ error: 'Failed to fetch adsense config' });
  }
};
