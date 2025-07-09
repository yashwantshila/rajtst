import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getPaidContents = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('paidContents').get();
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
