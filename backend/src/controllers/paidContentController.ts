import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { getStorage } from 'firebase-admin/storage';
import { Query } from 'firebase-admin/firestore';

export const getPaidContents = async (req: Request, res: Response) => {
  try {
    const { category } = req.query as { category?: string };
    let query: Query = db.collection('paidContents');
    if (category) {
      query = query.where('category', '==', category);
    }
    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(contents);
  } catch (error) {
    console.error('Error fetching paid contents:', error);
    res.status(500).json({ error: 'Failed to fetch paid contents' });
  }
};

export const getPurchasedContent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    const purchasedIds = userDoc.exists ? userDoc.data()?.purchases || [] : [];
    if (purchasedIds.length === 0) {
      return res.json([]);
    }
    const contentsSnap = await db.collection('paidContents').get();
    const contents = contentsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(content => purchasedIds.includes(content.id));
    res.json(contents);
  } catch (error) {
    console.error('Error fetching purchased content:', error);
    res.status(500).json({ error: 'Failed to fetch purchased content' });
  }
};

export const purchaseContent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ error: 'contentId is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const balanceRef = db.collection('balance').doc(userId);
    const contentDoc = await db.collection('paidContents').doc(contentId).get();
    if (!contentDoc.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }
    const content = contentDoc.data() as any;

    await db.runTransaction(async tx => {
      const [userDoc, balanceDoc] = await Promise.all([
        tx.get(userRef),
        tx.get(balanceRef)
      ]);
      const purchases: string[] = userDoc.exists ? userDoc.data()?.purchases || [] : [];
      if (purchases.includes(contentId)) {
        return;
      }
      const currentBalance = balanceDoc.exists ? balanceDoc.data()?.amount || 0 : 0;
      if (currentBalance < content.price) {
        throw new Error('Insufficient balance');
      }
      tx.update(balanceRef, {
        amount: currentBalance - content.price,
        lastUpdated: new Date().toISOString()
      });
      tx.set(userRef, { purchases: [...purchases, contentId] }, { merge: true });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ error: error.message || 'Failed to process purchase' });
  }
};

export const downloadPaidContent = async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    // Fetch content info from Firestore
    const doc = await db.collection('paidContents').doc(contentId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const data = doc.data() as { pdfUrl: string };
    const pdfUrl = data.pdfUrl;

    // Extract file path from the download URL
    const match = pdfUrl.match(/\/o\/(.+)\?alt=media/);
    const filePath = match ? decodeURIComponent(match[1]) : null;

    if (!filePath) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const bucketName = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(filePath);

    // Create a read stream and pipe to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name.split('/').pop()}"`);

    file.createReadStream().on('error', err => {
      console.error('Error streaming file:', err);
      res.status(500).end();
    }).pipe(res);
  } catch (error) {
    console.error('Error downloading content:', error);
    res.status(500).json({ error: 'Failed to download content' });
  }
};
