import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const submitPrizeClaim = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const { name, mobile, address, prize, rank, ipAddress, deviceId } = req.body;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const claimRef = db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('prize-claims')
      .doc(userId);

    await claimRef.set({
      name,
      mobile,
      address,
      prize,
      rank,
      userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ipAddress: ipAddress || req.ip,
      deviceId: deviceId || null,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting prize claim:', error);
    res.status(500).json({ error: 'Failed to submit prize claim' });
  }
};

export const getUserPrizes = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const megaTestsSnap = await db.collection('mega-tests').get();
    const result: any[] = [];
    const now = Date.now();

    for (const docSnap of megaTestsSnap.docs) {
      const megaTestId = docSnap.id;
      const megaTest = docSnap.data();
      const resultTime = megaTest.resultTime?.toMillis?.() ?? 0;
      if (resultTime > now) continue;

      const leaderboardSnap = await db
        .collection('mega-tests')
        .doc(megaTestId)
        .collection('leaderboard')
        .where('userId', '==', userId)
        .get();

      if (leaderboardSnap.empty) continue;

      const userEntry = leaderboardSnap.docs[0].data();
      const rank = userEntry.rank;

      const prizesSnap = await db
        .collection('mega-tests')
        .doc(megaTestId)
        .collection('prizes')
        .get();

      const prize = prizesSnap.docs
        .map(p => p.data())
        .find((p: any) => p.rank === rank);

      if (!prize) continue;

      const claimSnap = await db
        .collection('mega-tests')
        .doc(megaTestId)
        .collection('prize-claims')
        .doc(userId)
        .get();

      let claimStatus = 'unclaimed';
      if (claimSnap.exists) {
        claimStatus = (claimSnap.data() as any).status || 'claimed';
      }

      result.push({
        megaTestId,
        megaTestTitle: megaTest.title,
        prize: prize.prize,
        rank: prize.rank,
        claimStatus,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};
