import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getContentBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const docRef = db.collection('content').doc(slug);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(docSnap.data());
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};
