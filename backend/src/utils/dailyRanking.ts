import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export const recordDailyWinnings = async (userId: string, amount: number) => {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const rankingRef = db.collection('daily-rankings').doc(date);
  await rankingRef.set(
    {
      [userId]: FieldValue.increment(amount),
      lastUpdated: new Date().toISOString(),
    },
    { merge: true },
  );
};
