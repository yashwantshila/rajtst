import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';

export const useMegaTestParticipantCount = (megaTestId: string) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!megaTestId) return;

    const ref = collection(db, 'mega-tests', megaTestId, 'participants');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [megaTestId]);

  return count;
};
