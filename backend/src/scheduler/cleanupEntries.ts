import cron from 'node-cron';
import { db } from '../config/firebase.js';

export const scheduleDailyChallengeCleanup = () => {
  cron.schedule('59 23 * * *', async () => {
    const now = new Date();
    const snapshot = await db
      .collection('daily-challenge-entries')
      .where('expiresAt', '<=', now)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    if (!snapshot.empty) {
      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired challenge entries`);
    }
  }, { timezone: 'Asia/Kolkata' });
};
