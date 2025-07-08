import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getMegaTests = async (req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection('mega-tests')
      .orderBy('createdAt', 'desc')
      .get();
    const megaTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(megaTests);
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    res.status(500).json({ error: 'Failed to fetch mega tests' });
  }
};

export const registerForMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const { uid, email } = req.user!;
    const { username } = req.body;

    const megaTestDoc = await db.collection('mega-tests').doc(megaTestId).get();
    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }

    const megaTest = megaTestDoc.data() as any;
    const entryFee = megaTest.entryFee || 0;

    const balanceRef = db.collection('balance').doc(uid);
    const balanceDoc = await balanceRef.get();
    if (!balanceDoc.exists) {
      return res.status(400).json({ error: 'User balance not found' });
    }

    const currentBalance = balanceDoc.data()?.amount || 0;
    if (currentBalance < entryFee) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const batch = db.batch();
    if (entryFee > 0) {
      batch.update(balanceRef, {
        amount: currentBalance - entryFee,
        lastUpdated: new Date().toISOString()
      });
    }

    const participantRef = db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('participants')
      .doc(uid);

    batch.set(participantRef, {
      userId: uid,
      username,
      email,
      registeredAt: new Date(),
      entryFeePaid: entryFee
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering for mega test:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
