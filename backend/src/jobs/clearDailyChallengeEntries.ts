import cron from 'node-cron';
import { db } from '../config/firebase.js';

/**
 * Schedule a daily cleanup of the `daily-challenge-entries` collection.
 * The task runs at 23:59 Asia/Kolkata time to purge all documents
 * ensuring the database stays lean.
 */
export const scheduleDailyChallengeCleanup = () => {
  cron.schedule(
    '59 23 * * *',
    async () => {
      console.log('Running daily challenge cleanup');
      try {
        const snapshot = await db.collection('daily-challenge-entries').get();
        const batches = [] as FirebaseFirestore.WriteBatch[];
        let batch = db.batch();
        let opCount = 0;
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          opCount++;
          if (opCount === 500) {
            batches.push(batch);
            batch = db.batch();
            opCount = 0;
          }
        });
        if (opCount > 0) {
          batches.push(batch);
        }
        for (const b of batches) {
          await b.commit();
        }
        console.log(`Deleted ${snapshot.size} daily challenge entries`);
      } catch (error) {
        console.error('Failed to clear daily challenge entries', error);
      }
    },
    {
      timezone: 'Asia/Kolkata'
    },
  );
};
