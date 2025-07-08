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

export const getMegaTestLeaderboard = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;

    const leaderboardSnap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('leaderboard')
      .orderBy('score', 'desc')
      .get();

    const entries = leaderboardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(entries);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
export const getMegaTests = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('mega-tests').get();
    const megaTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    megaTests.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    res.json(megaTests);
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    res.status(500).json({ error: 'Failed to fetch mega tests' });
  }
};

export const getMegaTestById = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const megaTestRef = db.collection('mega-tests').doc(megaTestId);
    const [megaTestDoc, questionsSnap] = await Promise.all([
      megaTestRef.get(),
      megaTestRef.collection('questions').get()
    ]);
    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }
    const questions = questionsSnap.docs.map(q => ({ id: q.id, ...q.data() }));
    res.json({ megaTest: { id: megaTestDoc.id, ...megaTestDoc.data() }, questions });
  } catch (error) {
    console.error('Error fetching mega test:', error);
    res.status(500).json({ error: 'Failed to fetch mega test' });
  }
};

export const getMegaTestPrizes = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const prizesSnap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('prizes')
      .get();
    const prizes = prizesSnap.docs
      .map(p => p.data())
      .sort((a, b) => a.rank - b.rank);
    res.json(prizes);
  } catch (error) {
    console.error('Error fetching mega test prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

export const registerForMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const { username, email, ipAddress, deviceId } = req.body;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const megaTestRef = db.collection('mega-tests').doc(megaTestId);
    const megaTestDoc = await megaTestRef.get();
    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }
    const entryFee = megaTestDoc.data()?.entryFee || 0;
    const balanceRef = db.collection('balance').doc(userId);
    const balanceDoc = await balanceRef.get();
    if (!balanceDoc.exists) {
      return res.status(400).json({ error: 'User balance not found' });
    }
    const currentBalance = balanceDoc.data()?.amount || 0;
    if (currentBalance < entryFee) {
      return res.status(400).json({ error: `Insufficient balance. Required: ₹${entryFee}, Available: ₹${currentBalance}` });
    }
    await db.runTransaction(async transaction => {
      if (entryFee > 0) {
        transaction.update(balanceRef, {
          amount: currentBalance - entryFee,
          lastUpdated: new Date().toISOString()
        });
      }
      const participantRef = megaTestRef.collection('participants').doc(userId);
      transaction.set(participantRef, {
        userId,
        username,
        email,
        registeredAt: new Date().toISOString(),
        entryFeePaid: entryFee,
        ipAddress: ipAddress || req.ip,
        lastSeenIP: ipAddress || req.ip,
        deviceId: deviceId || null
      });
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering for mega test:', error);
    res.status(500).json({ error: 'Failed to register for mega test' });
  }
};

export const isUserRegistered = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const participantDoc = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('participants')
      .doc(userId)
      .get();
    res.json({ registered: participantDoc.exists });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ error: 'Failed to check registration' });
  }
};

export const hasUserSubmittedMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const submissionDoc = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('leaderboard')
      .doc(userId)
      .get();
    res.json({ submitted: submissionDoc.exists });
  } catch (error) {
    console.error('Error checking submission status:', error);
    res.status(500).json({ error: 'Failed to check submission status' });
  }
};

export const submitMegaTestResult = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const { score, completionTime } = req.body;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const leaderboardRef = db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('leaderboard');
    const leaderboardSnap = await leaderboardRef.get();
    const leaderboard = leaderboardSnap.docs.map(doc => doc.data() as any);
    const newEntry = {
      userId,
      score,
      rank: 0,
      submittedAt: new Date().toISOString(),
      completionTime
    };
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completionTime - b.completionTime;
    });
    const batch = db.batch();
    leaderboard.forEach((entry, index) => {
      const ref = leaderboardRef.doc(entry.userId);
      batch.set(ref, { ...entry, rank: index + 1 });
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting mega test result:', error);
    res.status(500).json({ error: 'Failed to submit mega test result' });
  }
};
