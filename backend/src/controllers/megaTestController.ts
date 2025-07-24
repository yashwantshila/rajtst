import { Request, Response } from 'express';
import { db } from '../config/firebase.js';


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

      const leaderboardRef = db
        .collection('mega-tests')
        .doc(megaTestId)
        .collection('leaderboard')
        .doc(userId);
      const leaderboardDoc = await leaderboardRef.get();

      if (!leaderboardDoc.exists) continue;

      const userEntry = leaderboardDoc.data() as any;
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

      const amount = parseFloat(String(prize.prize).replace(/[^0-9.]/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      if (!userEntry.prizeCredited) {
        const balanceRef = db.collection('balance').doc(userId);
        await db.runTransaction(async tx => {
          const balDoc = await tx.get(balanceRef);
          const current = balDoc.exists ? balDoc.data()?.amount || 0 : 0;
          tx.set(balanceRef, {
            amount: current + amount,
            currency: 'INR',
            lastUpdated: new Date().toISOString(),
          }, { merge: true });
          tx.update(leaderboardRef, { prizeCredited: true });
        });
      }

      result.push({
        megaTestId,
        megaTestTitle: megaTest.title,
        prize: `₹${amount}`,
        rank: prize.rank,
        claimStatus: 'credited',
      });
    }

    // Include prizes from user-prizes collection and clean up expired ones
    const userPrizeSnap = await db
      .collection('user-prizes')
      .where('userId', '==', userId)
      .get();
    const expired: FirebaseFirestore.DocumentReference[] = [];
    userPrizeSnap.docs.forEach(doc => {
      const data = doc.data() as any;
      const expiresAt: any = data.expiresAt;
      const expiryMs = expiresAt?.toMillis?.() ?? new Date(expiresAt).getTime();
      if (expiryMs && expiryMs <= now) {
        expired.push(doc.ref);
        return;
      }
      result.push({
        megaTestId: data.megaTestId,
        megaTestTitle: data.megaTestTitle,
        prize: data.prize,
        rank: data.rank,
        claimStatus: 'credited',
      });
    });
    if (expired.length > 0) {
      const batch = db.batch();
      expired.forEach(ref => batch.delete(ref));
      await batch.commit();
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
      .orderBy('rank', 'asc')
      .get();

    const entries = leaderboardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(entries);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const getMegaTests = async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection('mega-tests').where('enabled', '==', true).get();
    const tests = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() ?? 0;
        const bTime = (b as any).createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    res.json(tests);
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    res.status(500).json({ error: 'Failed to fetch mega tests' });
  }
};

export const registerForMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const { userId, username, email } = req.body;

    // ---- Determine client IP address ----
    let userIpAddress: string | undefined;
    const forwardedForHeader = req.headers['x-forwarded-for'];
    const realIpHeader = req.headers['x-real-ip'];

    if (typeof forwardedForHeader === 'string') {
      userIpAddress = forwardedForHeader.split(',')[0].trim();
    }

    if (!userIpAddress && typeof realIpHeader === 'string') {
      userIpAddress = realIpHeader.split(',')[0].trim();
    }

    if (!userIpAddress && req.connection && typeof req.connection.remoteAddress === 'string') {
      userIpAddress = req.connection.remoteAddress;
    }

    if (!userIpAddress && req.socket && typeof req.socket.remoteAddress === 'string') {
      userIpAddress = req.socket.remoteAddress;
    }

    if (!userIpAddress) {
      userIpAddress = req.ip;
    }

    const deviceId = req.cookies?.device_id;
    const megaTestRef = db.collection('mega-tests').doc(megaTestId);
    const megaTestDoc = await megaTestRef.get();
    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }
    const megaTest = megaTestDoc.data() as any;
    if (megaTest.maxParticipants) {
      const participantsSnap = await megaTestRef.collection('participants').get();
      if (participantsSnap.size >= megaTest.maxParticipants) {
        return res.status(400).json({ error: 'Mega test participant limit reached' });
      }
    }
    const entryFee = megaTest.entryFee || 0;

    const balanceRef = db.collection('balance').doc(userId);
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
        lastUpdated: new Date().toISOString(),
      });
    }

    const participantRef = megaTestRef.collection('participants').doc(userId);
    batch.set(participantRef, {
      userId,
      username,
      email,
      registeredAt: new Date().toISOString(),
      entryFeePaid: entryFee,
      ipAddress: userIpAddress || 'N/A',
      lastSeenIP: userIpAddress || 'N/A',
      deviceId: deviceId || 'N/A',
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering for mega test:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
};

export const startMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const participantRef = db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('participants')
      .doc(userId);

    await participantRef.set(
      {
        startTime: new Date().toISOString(),
      },
      { merge: true },
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error starting mega test:', error);
    res.status(500).json({ error: 'Failed to start mega test' });
  }
};

export const isUserRegistered = async (req: Request, res: Response) => {
  try {
    const { megaTestId, userId } = req.params;
    const docSnap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('participants')
      .doc(userId)
      .get();
    res.json({ registered: docSnap.exists });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ error: 'Failed to check registration' });
  }
};

export const hasUserSubmittedMegaTest = async (req: Request, res: Response) => {
  try {
    const { megaTestId, userId } = req.params;
    const docSnap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('leaderboard')
      .doc(userId)
      .get();
    res.json({ submitted: docSnap.exists });
  } catch (error) {
    console.error('Error checking submission:', error);
    res.status(500).json({ error: 'Failed to check submission' });
  }
};

export const getMegaTestById = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const megaTestRef = db.collection('mega-tests').doc(megaTestId);
    const [megaTestDoc, questionsSnap] = await Promise.all([
      megaTestRef.get(),
      megaTestRef.collection('questions').get(),
    ]);

    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }

    const megaTest = { id: megaTestDoc.id, ...megaTestDoc.data() };

    // Only include correct answers for admins or after results are published
    const now = Date.now();
    const resultTimeRaw: any = (megaTest as any).resultTime;
    const resultTime = resultTimeRaw?.toMillis?.() ?? new Date(resultTimeRaw).getTime();
    const includeAnswers = req.user?.role === 'admin' || (resultTime && now >= resultTime);

    const questions = questionsSnap.docs.map(q => {
      const data = q.data() as any;
      const question: any = {
        id: q.id,
        text: data.text,
        options: data.options,
      };
      if (includeAnswers) {
        question.correctAnswer = data.correctAnswer;
      }
      return question;
    });

    res.json({ megaTest, questions });
  } catch (error) {
    console.error('Error fetching mega test:', error);
    res.status(500).json({ error: 'Failed to fetch mega test' });
  }
};

export const getMegaTestPrizes = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const snap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('prizes')
      .get();
    const prizes = snap.docs
      .map(p => p.data())
      .sort((a: any, b: any) => a.rank - b.rank);
    res.json(prizes);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

export const getMegaTestParticipantCount = async (
  req: Request,
  res: Response
) => {
  try {
    const { megaTestId } = req.params;
    const snap = await db
      .collection('mega-tests')
      .doc(megaTestId)
      .collection('participants')
      .get();
    res.json({ count: snap.size });
  } catch (error) {
    console.error('Error getting participant count:', error);
    res.status(500).json({ error: 'Failed to get participant count' });
  }
};

export const submitMegaTestResult = async (req: Request, res: Response) => {
  try {
    const { megaTestId } = req.params;
    const userId = req.user?.uid;
    const { answers } = req.body as {
      answers: Record<string, string>;
      completionTime?: number;
    };

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const megaTestRef = db.collection('mega-tests').doc(megaTestId);
    const leaderboardRef = megaTestRef.collection('leaderboard');
    const participantRef = megaTestRef.collection('participants').doc(userId);
    const participantDoc = await participantRef.get();

    if (!participantDoc.exists || !(participantDoc.data() as any).startTime) {
      return res.status(400).json({ error: 'Mega test not started' });
    }

    const questionsSnap = await megaTestRef.collection('questions').get();
    const questions = questionsSnap.docs.map(q => ({
      ...q.data(),
      id: q.id,
    })) as any[];

    let score = 0;
    questions.forEach(q => {
      const ans = answers?.[q.id];
      if (ans && ans === q.correctAnswer) {
        score++;
      }
    });

    const leaderboardSnap = await leaderboardRef.get();
    const leaderboard = leaderboardSnap.docs.map(doc => doc.data() as any);

    const start = (participantDoc.data() as any).startTime;
    const startMs = new Date(start).getTime();
    const computedCompletionTime = Math.floor((Date.now() - startMs) / 1000);

    const newEntry = {
      userId,
      score,
      rank: 0,
      submittedAt: new Date().toISOString(),
      completionTime: computedCompletionTime,
    };

    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.completionTime !== b.completionTime) {
        return a.completionTime - b.completionTime;
      }
      const aTime = new Date(a.submittedAt).getTime();
      const bTime = new Date(b.submittedAt).getTime();
      return aTime - bTime;
    });

    const batch = db.batch();
    leaderboard.forEach((entry: any, index: number) => {
      const ref = leaderboardRef.doc(entry.userId);
      batch.set(ref, { ...entry, rank: index + 1 });
    });

    await batch.commit();
    res.json({ success: true, score });
  } catch (error) {
    console.error('Error submitting mega test result:', error);
    res.status(500).json({ error: 'Failed to submit result' });
  }
};
