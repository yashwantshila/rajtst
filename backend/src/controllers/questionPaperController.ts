import { Request, Response } from 'express';
import { db, storage } from '../config/firebase.js';

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

interface Paper {
  id: string;
  createdAt?: { toMillis?: () => number };
  [key: string]: any;
}

export const getQuestionPapersByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const snapshot = await db
      .collection('questionPapers')
      .where('categoryId', '==', categoryId)
      .get();
    const papers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Paper))
      .sort((a, b) => {
        const aTime = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
        const bTime = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    res.json(papers);
  } catch (error) {
    console.error('Error fetching question papers:', error);
    res.status(500).json({ error: 'Failed to fetch question papers' });
  }
};

// Helper to extract a file path from Firebase Storage URLs.
// Converts a signed download URL into the original path inside the bucket.
const extractFilePath = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const idx = pathname.indexOf('/o/');
    if (idx === -1) return null;
    return decodeURIComponent(pathname.slice(idx + 3));
  } catch {
    return null;
  }
};

export const downloadQuestionPaper = async (req: Request, res: Response) => {
  try {
    const { paperId } = req.params;
    const docSnap = await db.collection('questionPapers').doc(paperId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    const data = docSnap.data() as any;
    const filePath = extractFilePath(data.fileUrl);
    if (!filePath) {
      return res.status(500).json({ error: 'Invalid file path' });
    }

    const file = storage.bucket().file(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name.split('/').pop()}"`);
    file.createReadStream()
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
