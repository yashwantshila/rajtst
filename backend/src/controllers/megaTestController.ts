import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export const getMegaTests = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('mega-tests').get();
    const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    tests.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    res.json(tests);
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    res.status(500).json({ error: 'Failed to fetch mega tests' });
  }
};

export const getMegaTestById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const megaTestRef = db.collection('mega-tests').doc(id);
    const [megaTestDoc, questionsSnap] = await Promise.all([
      megaTestRef.get(),
      megaTestRef.collection('questions').get()
    ]);

    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }

    const questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ megaTest: { id: megaTestDoc.id, ...megaTestDoc.data() }, questions });
  } catch (error) {
    console.error('Error fetching mega test:', error);
    res.status(500).json({ error: 'Failed to fetch mega test' });
  }
};

export const getMegaTestPrizes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prizesSnap = await db.collection('mega-tests').doc(id).collection('prizes').get();
    const prizes = prizesSnap.docs.map(d => d.data()).sort((a, b) => a.rank - b.rank);
    res.json(prizes);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

export const createMegaTest = async (req: Request, res: Response) => {
  try {
    const { questions, prizes, ...data } = req.body;
    const batch = db.batch();
    const megaRef = db.collection('mega-tests').doc();

    batch.set(megaRef, {
      ...data,
      totalQuestions: Array.isArray(questions) ? questions.length : 0,
      status: 'upcoming',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      timeLimit: data.timeLimit || 60
    });

    (questions || []).forEach((q: any) => {
      const qRef = megaRef.collection('questions').doc();
      batch.set(qRef, q);
    });

    (prizes || []).forEach((p: any) => {
      const pRef = megaRef.collection('prizes').doc();
      batch.set(pRef, p);
    });

    await batch.commit();
    const newDoc = await megaRef.get();
    res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (error) {
    console.error('Error creating mega test:', error);
    res.status(500).json({ error: 'Failed to create mega test' });
  }
};

export const registerForMegaTest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, username, email } = req.body;

    const megaRef = db.collection('mega-tests').doc(id);
    const megaDoc = await megaRef.get();
    if (!megaDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }

    const entryFee = megaDoc.data()?.entryFee || 0;
    const balanceRef = db.collection('balance').doc(userId);
    const balanceDoc = await balanceRef.get();
    if (!balanceDoc.exists) {
      return res.status(404).json({ error: 'User balance not found' });
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

    const participantRef = megaRef.collection('participants').doc(userId);
    batch.set(participantRef, {
      userId,
      username,
      email,
      registeredAt: FieldValue.serverTimestamp(),
      entryFeePaid: entryFee,
      ipAddress: req.ip,
      lastSeenIP: req.ip
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering for mega test:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
};

export const isUserRegistered = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const docSnap = await db.collection('mega-tests').doc(id).collection('participants').doc(userId).get();
    res.json({ registered: docSnap.exists });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ error: 'Failed to check registration' });
  }
};

export const hasUserSubmittedMegaTest = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const docSnap = await db.collection('mega-tests').doc(id).collection('leaderboard').doc(userId).get();
    res.json({ submitted: docSnap.exists });
  } catch (error) {
    console.error('Error checking submission:', error);
    res.status(500).json({ error: 'Failed to check submission' });
  }
};

export const submitMegaTestResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, score, completionTime } = req.body;

    const leaderboardRef = db.collection('mega-tests').doc(id).collection('leaderboard');
    const leaderboardSnap = await leaderboardRef.get();
    const leaderboard = leaderboardSnap.docs.map(d => d.data());
    leaderboard.push({ userId, score, rank: 0, submittedAt: FieldValue.serverTimestamp(), completionTime });

    leaderboard.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
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
    console.error('Error submitting result:', error);
    res.status(500).json({ error: 'Failed to submit result' });
  }
};

export const getMegaTestLeaderboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snap = await db.collection('mega-tests').doc(id).collection('leaderboard').get();
    const data = snap.docs.map(d => d.data()).sort((a, b) => a.rank - b.rank);
    res.json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const getMegaTestPrizePool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participantsSnap = await db.collection('mega-tests').doc(id).collection('participants').get();
    const total = participantsSnap.docs.reduce((sum, doc) => sum + (doc.data().entryFeePaid || 0), 0);
    res.json({ prizePool: total });
  } catch (error) {
    console.error('Error calculating prize pool:', error);
    res.status(500).json({ error: 'Failed to calculate prize pool' });
  }
};

export const getMegaTestParticipantCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snap = await db.collection('mega-tests').doc(id).collection('participants').get();
    res.json({ count: snap.size });
  } catch (error) {
    console.error('Error getting participant count:', error);
    res.status(500).json({ error: 'Failed to get participant count' });
  }
};

export const getMegaTestParticipants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snap = await db.collection('mega-tests').doc(id).collection('participants').get();
    const data = snap.docs.map(d => d.data());
    res.json(data);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
};
