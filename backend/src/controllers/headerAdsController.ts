import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getHeaderAds = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('headerAds').get();
    const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(ads);
  } catch (error) {
    console.error('Error fetching header ads:', error);
    res.status(500).json({ error: 'Failed to fetch header ads' });
  }
};

export const createHeaderAd = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const docRef = await db.collection('headerAds').add({
      ...data,
      createdAt: new Date().toISOString()
    });
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Error creating header ad:', error);
    res.status(500).json({ error: 'Failed to create header ad' });
  }
};

export const updateHeaderAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.collection('headerAds').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
    res.json({ id, ...data });
  } catch (error) {
    console.error('Error updating header ad:', error);
    res.status(500).json({ error: 'Failed to update header ad' });
  }
};

export const deleteHeaderAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('headerAds').doc(id).delete();
    res.json({ id });
  } catch (error) {
    console.error('Error deleting header ad:', error);
    res.status(500).json({ error: 'Failed to delete header ad' });
  }
};
