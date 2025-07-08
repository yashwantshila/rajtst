import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { FieldValue, Timestamp, WriteBatch } from 'firebase-admin/firestore';

export const getMegaTests = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('mega-tests').get();
    const megaTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    megaTests.sort((a: any, b: any) => {
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
    const id = req.params.id;
    const megaTestRef = db.collection('mega-tests').doc(id);
    const [megaTestDoc, questionsSnap] = await Promise.all([
      megaTestRef.get(),
      megaTestRef.collection('questions').get()
    ]);
    if (!megaTestDoc.exists) {
      return res.json({ megaTest: null, questions: [] });
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
    const id = req.params.id;
    const snapshot = await db.collection('mega-tests').doc(id).collection('prizes').get();
    const prizes = snapshot.docs.map(d => d.data()).sort((a, b) => a.rank - b.rank);
    res.json(prizes);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

export const registerForMegaTest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { userId, username, email } = req.body;
    const megaTestRef = db.collection('mega-tests').doc(id);
    const megaTestDoc = await megaTestRef.get();
    if (!megaTestDoc.exists) {
      return res.status(404).json({ error: 'Mega test not found' });
    }
    const entryFee = megaTestDoc.data()?.entryFee || 0;
    const balanceRef = db.collection('balance').doc(userId);
    const balanceDoc = await balanceRef.get();
    if (!balanceDoc.exists) {
      return res.status(404).json({ error: 'User balance not found' });
    }
    const currentBalance = balanceDoc.data()?.amount || 0;
    if (currentBalance < entryFee) {
      return res.status(400).json({ error: `Insufficient balance. Required: ₹${entryFee}, Available: ₹${currentBalance}` });
    }
    const batch = db.batch();
    if (entryFee > 0) {
      batch.update(balanceRef, { amount: currentBalance - entryFee, lastUpdated: new Date().toISOString() });
    }
    const participantRef = megaTestRef.collection('participants').doc(userId);
    batch.set(participantRef, {
      userId,
      username,
      email,
      registeredAt: FieldValue.serverTimestamp(),
      entryFeePaid: entryFee
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error registering for mega test:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

export const isUserRegistered = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const docRef = db.collection('mega-tests').doc(id).collection('participants').doc(userId);
    const docSnap = await docRef.get();
    res.json({ registered: docSnap.exists });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ error: 'Failed to check registration' });
  }
};

export const hasUserSubmittedMegaTest = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const docRef = db.collection('mega-tests').doc(id).collection('leaderboard').doc(userId);
    const docSnap = await docRef.get();
    res.json({ submitted: docSnap.exists });
  } catch (error) {
    console.error('Error checking submission:', error);
    res.status(500).json({ error: 'Failed to check submission' });
  }
};

export const markMegaTestStarted = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { userId } = req.body;
    const participantRef = db.collection('mega-tests').doc(id).collection('participants').doc(userId);
    const docSnap = await participantRef.get();
    if (docSnap.exists && !docSnap.data().startTime) {
      await participantRef.update({ startTime: FieldValue.serverTimestamp() });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking start:', error);
    res.status(500).json({ error: 'Failed to mark start' });
  }
};

export const submitMegaTestResult = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { userId, score, completionTime } = req.body;
    const participantRef = db.collection('mega-tests').doc(id).collection('participants').doc(userId);
    const participantDoc = await participantRef.get();
    let finalTime = completionTime;
    if (participantDoc.exists) {
      const data = participantDoc.data();
      if (data.startTime) {
        const startTime = (data.startTime as Timestamp).toMillis();
        finalTime = Math.floor((Timestamp.now().toMillis() - startTime) / 1000);
      }
    }
    const leaderboardRef = db.collection('mega-tests').doc(id).collection('leaderboard');
    const leaderboardSnap = await leaderboardRef.get();
    const leaderboard = leaderboardSnap.docs.map(doc => doc.data()) as any[];
    const newEntry = { userId, score, rank: 0, submittedAt: FieldValue.serverTimestamp(), completionTime: finalTime };
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => a.score === b.score ? a.completionTime - b.completionTime : b.score - a.score);
    const batch = db.batch();
    leaderboard.forEach((entry, idx) => {
      const ref = leaderboardRef.doc(entry.userId);
      batch.set(ref, { ...entry, rank: idx + 1 });
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
    const id = req.params.id;
    const snapshot = await db.collection('mega-tests').doc(id).collection('leaderboard').get();
    const entries = snapshot.docs.map(doc => doc.data()).sort((a, b) => a.rank - b.rank);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const createMegaTest = async (req: Request, res: Response) => {
  try {
    const { questions, prizes, ...megaTestData } = req.body;
    const megaTestRef = db.collection('mega-tests').doc();
    const batch = db.batch();
    batch.set(megaTestRef, {
      ...megaTestData,
      totalQuestions: questions.length,
      status: 'upcoming',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      timeLimit: megaTestData.timeLimit || 60
    });
    questions.forEach((q: any) => {
      const qRef = megaTestRef.collection('questions').doc();
      batch.set(qRef, q);
    });
    prizes.forEach((p: any) => {
      const pRef = megaTestRef.collection('prizes').doc();
      batch.set(pRef, p);
    });
    await batch.commit();
    const newDoc = await megaTestRef.get();
    res.json({ id: newDoc.id, ...newDoc.data() });
  } catch (error) {
    console.error('Error creating mega test:', error);
    res.status(500).json({ error: 'Failed to create mega test' });
  }
};

export const updateMegaTest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { questions, prizes, ...data } = req.body;
    const megaTestRef = db.collection('mega-tests').doc(id);
    const batch = db.batch();
    const updateData: any = { ...data, updatedAt: FieldValue.serverTimestamp() };
    if (questions) updateData.totalQuestions = questions.length;
    batch.update(megaTestRef, updateData);
    if (questions) {
      const qRef = megaTestRef.collection('questions');
      const existing = await qRef.get();
      existing.docs.forEach(d => batch.delete(d.ref));
      questions.forEach((q: any) => batch.set(qRef.doc(), q));
    }
    if (prizes) {
      const pRef = megaTestRef.collection('prizes');
      const existing = await pRef.get();
      existing.docs.forEach(d => batch.delete(d.ref));
      prizes.forEach((p: any) => batch.set(pRef.doc(), p));
    }
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating mega test:', error);
    res.status(500).json({ error: 'Failed to update mega test' });
  }
};

export const deleteMegaTest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const megaTestRef = db.collection('mega-tests').doc(id);
    const batch = db.batch();
    const subcollections = ['questions', 'participants', 'leaderboard', 'prizes'];
    for (const sub of subcollections) {
      const snap = await megaTestRef.collection(sub).get();
      snap.docs.forEach(doc => batch.delete(doc.ref));
    }
    batch.delete(megaTestRef);
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mega test:', error);
    res.status(500).json({ error: 'Failed to delete mega test' });
  }
};

export const getMegaTestPrizePool = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
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
    const id = req.params.id;
    const snap = await db.collection('mega-tests').doc(id).collection('participants').get();
    res.json({ count: snap.size });
  } catch (error) {
    console.error('Error getting participant count:', error);
    res.status(500).json({ error: 'Failed to get participant count' });
  }
};

export const adminAddOrUpdateLeaderboardEntry = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { userId, score, completionTime } = req.body;
    const leaderboardRef = db.collection('mega-tests').doc(id).collection('leaderboard');
    const snapshot = await leaderboardRef.get();
    let leaderboard = snapshot.docs.map(doc => doc.data()) as any[];
    leaderboard = leaderboard.filter(e => e.userId !== userId);
    const newEntry = { userId, score, rank: 0, submittedAt: FieldValue.serverTimestamp(), completionTime };
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => a.score === b.score ? a.completionTime - b.completionTime : b.score - a.score);
    const batch = db.batch();
    leaderboard.forEach((entry, idx) => batch.set(leaderboardRef.doc(entry.userId), { ...entry, rank: idx + 1 }));
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
};

export const getMegaTestParticipants = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const snap = await db.collection('mega-tests').doc(id).collection('participants').get();
    const participants = snap.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        username: data.username || '',
        email: data.email || '',
        registeredAt: data.registeredAt || null,
        ipAddress: data.ipAddress || 'N/A',
        lastSeenIP: data.lastSeenIP || 'N/A',
        deviceId: data.deviceId || 'N/A'
      };
    });
    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
};
