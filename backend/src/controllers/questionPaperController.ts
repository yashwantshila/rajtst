import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getQuestionPaperCategories = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('questionPaperCategories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (error) {
    console.error('Error fetching question paper categories:', error);
    res.status(500).json({ error: 'Failed to fetch question paper categories' });
  }
};

export const getQuestionPapersByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const snapshot = await db
      .collection('questionPapers')
      .where('categoryId', '==', categoryId)
      .get();
    const papers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis?.() ?? 0;
        const bTime = (b.createdAt as any)?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    res.json(papers);
  } catch (error) {
    console.error('Error fetching question papers:', error);
    res.status(500).json({ error: 'Failed to fetch question papers' });
  }
};
