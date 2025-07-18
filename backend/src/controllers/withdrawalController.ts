import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const MINIMUM_WITHDRAWAL_AMOUNT = 50;

export const createWithdrawalRequest = async (req: Request, res: Response) => {
  try {
    const { userId, amount, upiId, userName } = req.body;
    if (!userId || !amount || !upiId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (numericAmount < MINIMUM_WITHDRAWAL_AMOUNT) {
      return res
        .status(400)
        .json({ error: `Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL_AMOUNT}` });
    }

    await db.runTransaction(async (transaction) => {
      const balanceRef = db.collection('balance').doc(userId);
      const balanceDoc = await transaction.get(balanceRef);
      const currentBalance = balanceDoc.exists ? balanceDoc.data()?.amount || 0 : 0;

      if (currentBalance < numericAmount) {
        throw new Error('Insufficient balance');
      }

      transaction.set(
        balanceRef,
        {
          amount: currentBalance - numericAmount,
          currency: 'INR',
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    });

    const docRef = await db.collection('withdrawals').add({
      userId,
      userName: userName || '',
      amount: numericAmount,
      upiId,
      status: 'pending',
      requestDate: new Date().toISOString(),
    });

    res.json({ id: docRef.id });
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ error: 'Failed to create withdrawal request' });
  }
};

export const getUserWithdrawalRequests = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const snapshot = await db
      .collection('withdrawals')
      .where('userId', '==', userId)
      .get();

    const withdrawals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    withdrawals.sort(
      (a, b) => new Date((b as any).requestDate).getTime() - new Date((a as any).requestDate).getTime()
    );
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching user withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal requests' });
  }
};

export const getAllWithdrawalRequests = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('withdrawals').get();
    const withdrawals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    withdrawals.sort(
      (a, b) => new Date((b as any).requestDate).getTime() - new Date((a as any).requestDate).getTime()
    );
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching all withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};

export const updateWithdrawalStatus = async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;
    const { status, notes } = req.body;

    if (!withdrawalId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['pending', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();
    if (!withdrawalDoc.exists) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    const withdrawalData = withdrawalDoc.data() as any;

    if (status === 'rejected' && withdrawalData.status === 'pending') {
      await db.runTransaction(async (transaction) => {
        const balanceRef = db.collection('balance').doc(withdrawalData.userId);
        const balanceDoc = await transaction.get(balanceRef);
        const currentBalance = balanceDoc.exists ? balanceDoc.data()?.amount || 0 : 0;
        transaction.set(
          balanceRef,
          {
            amount: currentBalance + withdrawalData.amount,
            currency: 'INR',
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      });
    }

    await withdrawalRef.update({
      status,
      notes: notes || '',
      completionDate: new Date().toISOString(),
    });

    res.json({ message: 'Withdrawal updated' });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status' });
  }
};

export const deleteWithdrawalRequest = async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;
    if (!withdrawalId) {
      return res.status(400).json({ error: 'Withdrawal ID is required' });
    }
    await db.collection('withdrawals').doc(withdrawalId).delete();
    res.json({ message: 'Withdrawal deleted' });
  } catch (error) {
    console.error('Error deleting withdrawal:', error);
    res.status(500).json({ error: 'Failed to delete withdrawal' });
  }
};
