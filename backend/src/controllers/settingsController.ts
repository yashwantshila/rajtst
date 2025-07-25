import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const docRef = db.collection('config').doc('settings');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.json({ maintenanceMode: false });
    }
    return res.json(docSnap.data());
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};
