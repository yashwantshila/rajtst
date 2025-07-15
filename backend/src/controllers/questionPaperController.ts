import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { getStorage } from 'firebase-admin/storage';

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

export const downloadQuestionPaper = async (req: Request, res: Response) => {
  try {
    const { paperId } = req.params;

    const doc = await db.collection('questionPapers').doc(paperId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    const data = doc.data() as { fileUrl: string };
    const match = data.fileUrl.match(/\/o\/(.+)\?alt=media/);
    const filePath = match ? decodeURIComponent(match[1]) : null;

    if (!filePath) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const bucketName = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.name.split('/').pop()}"`
    );

    file
      .createReadStream()
      .on('error', err => {
        console.error('Error streaming file:', err);
        res.status(500).end();
      })
      .pipe(res);
  } catch (error) {
    console.error('Error downloading question paper:', error);
    res.status(500).json({ error: 'Failed to download question paper' });
  }
};
