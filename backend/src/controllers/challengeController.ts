import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

interface ChallengeEntry {
  userId: string;
  challengeId: string;
  date: string;
  correctCount: number;
  attemptedQuestions: string[];
  completed: boolean;
  won: boolean;
  startedAt: string;
  completedAt?: string;
}

const checkTimeLimitAndUpdate = async (
  entryRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  entry: ChallengeEntry,
  challenge: any,
) => {
  if (entry.completed) return entry
  const limit = challenge.timeLimit || 0
  if (limit) {
    const start = new Date(entry.startedAt).getTime()
    if (Date.now() - start >= limit * 1000) {
      const won = entry.correctCount >= (challenge.requiredCorrect || 0)
      const updated = { completed: true, won, completedAt: new Date().toISOString() }
      await entryRef.set(updated, { merge: true })
      return { ...entry, ...updated }
    }
  }
  return entry
}

export const createChallenge = async (req: Request, res: Response) => {
  try {
    const { title, reward, requiredCorrect, timeLimit } = req.body as {
      title: string;
      reward: number;
      requiredCorrect: number;
      timeLimit: number;
    };
    if (!title || !reward || !requiredCorrect || !timeLimit) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const challengeRef = await db.collection('daily-challenges').add({
      title,
      reward,
      requiredCorrect,
      timeLimit,
      active: true,
      createdAt: new Date().toISOString(),
    });
    res.json({ id: challengeRef.id });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const { text, options, correctAnswer } = req.body as {
      text: string;
      options: string[];
      correctAnswer: string;
    };
    if (!text || !options || !correctAnswer) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .add({ text, options, correctAnswer });
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
};

export const addBulkQuestions = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const { questions } = req.body as {
      questions: { text: string; options: string[]; correctAnswer: string }[];
    };
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Missing questions' });
    }
    const batch = db.batch();
    const colRef = db.collection('daily-challenges').doc(challengeId).collection('questions');
    questions.forEach(q => {
      const docRef = colRef.doc();
      batch.set(docRef, { text: q.text, options: q.options, correctAnswer: q.correctAnswer });
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding bulk questions:', error);
    res.status(500).json({ error: 'Failed to add questions' });
  }
};

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const snap = await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .get();
    const questions = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { challengeId, questionId } = req.params;
    const { text, options, correctAnswer } = req.body as {
      text: string;
      options: string[];
      correctAnswer: string;
    };
    await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .doc(questionId)
      .update({ text, options, correctAnswer });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { challengeId, questionId } = req.params;
    await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .doc(questionId)
      .delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

export const deleteChallenge = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    await db.collection('daily-challenges').doc(challengeId).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
};

export const getQuestionCount = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const snap = await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .get();
    res.json({ count: snap.size });
  } catch (error) {
    console.error('Error getting question count:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
};

export const getDailyChallenges = async (_req: Request, res: Response) => {
  try {
    const snap = await db
      .collection('daily-challenges')
      .where('active', '==', true)
      .get();
    const challenges = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

export const startChallenge = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const date = new Date().toISOString().split('T')[0];
    const entryId = `${challengeId}_${userId}_${date}`;
    const entryRef = db.collection('daily-challenge-entries').doc(entryId);
    const entryDoc = await entryRef.get();
    if (entryDoc.exists) {
      return res.status(400).json({ error: 'Already participated today' });
    }
    const entry: ChallengeEntry = {
      userId,
      challengeId,
      date,
      correctCount: 0,
      attemptedQuestions: [],
      completed: false,
      won: false,
      startedAt: new Date().toISOString(),
    };
    await entryRef.set(entry);
    res.json({ success: true });
  } catch (error) {
    console.error('Error starting challenge:', error);
    res.status(500).json({ error: 'Failed to start challenge' });
  }
};

export const getChallengeStatus = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const date = new Date().toISOString().split('T')[0];
    const entryId = `${challengeId}_${userId}_${date}`;
    const entryDoc = await db
      .collection('daily-challenge-entries')
      .doc(entryId)
      .get();
    if (!entryDoc.exists) {
      return res.status(404).json({ error: 'Challenge not started' });
    }
    const challengeDoc = await db.collection('daily-challenges').doc(challengeId).get();
    const challenge = challengeDoc.data() as any;
    const timeLimit = challengeDoc.exists ? challenge.timeLimit : 0;
    const entryRef = db.collection('daily-challenge-entries').doc(entryId);
    const updatedEntry = await checkTimeLimitAndUpdate(entryRef, entryDoc.data() as ChallengeEntry, challenge);
    res.json({ ...updatedEntry, timeLimit });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

export const getNextQuestion = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const date = new Date().toISOString().split('T')[0];
    const entryId = `${challengeId}_${userId}_${date}`;
    const entryRef = db.collection('daily-challenge-entries').doc(entryId);
    const entryDoc = await entryRef.get();
    if (!entryDoc.exists) {
      return res.status(400).json({ error: 'Challenge not started' });
    }
    let entry = entryDoc.data() as ChallengeEntry;
    const challengeDoc = await db.collection('daily-challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    const challenge = challengeDoc.data() as any;
    entry = await checkTimeLimitAndUpdate(entryRef, entry, challenge);
    if (entry.completed) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }
    const attempted = entry.attemptedQuestions || [];
    const questionsSnap = await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .get();
    const available = questionsSnap.docs.filter(q => !attempted.includes(q.id));
    if (available.length === 0) {
      const won = entry.correctCount >= (challenge.requiredCorrect || 0);
      const finished = { completed: true, won, completedAt: new Date().toISOString() };
      await entryRef.set(finished, { merge: true });
      return res.status(200).json({ ...entry, ...finished, timeLimit: challenge.timeLimit });
    }
    const randomDoc =
      available[Math.floor(Math.random() * available.length)];
    const data = randomDoc.data() as any;
    const { correctAnswer, ...question } = data;
    res.json({ id: randomDoc.id, ...question });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
};

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const { questionId, answer } = req.body as {
      questionId: string;
      answer: string;
    };
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const date = new Date().toISOString().split('T')[0];
    const entryId = `${challengeId}_${userId}_${date}`;
    const entryRef = db.collection('daily-challenge-entries').doc(entryId);
    const entryDoc = await entryRef.get();
    if (!entryDoc.exists) {
      return res.status(400).json({ error: 'Challenge not started' });
    }
    let entry = entryDoc.data() as ChallengeEntry;
    const challengeDoc = await db.collection('daily-challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    const challenge = challengeDoc.data() as any;
    entry = await checkTimeLimitAndUpdate(entryRef, entry, challenge);
    if (entry.completed) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }
    const required = challenge.requiredCorrect;
    const reward = challenge.reward || 0;
    const timeLimit = challenge.timeLimit || 0;

    const questionDoc = await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .doc(questionId)
      .get();
    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const qData = questionDoc.data() as any;
    const normalize = (val: string) => val.trim().toLowerCase();
    let isCorrect: boolean;
    const letter = normalize(qData.correctAnswer);
    if (["a", "b", "c", "d"].includes(letter)) {
      const idx = ["a", "b", "c", "d"].indexOf(letter);
      const correctText = qData.options?.[idx] || "";
      isCorrect = normalize(correctText) === normalize(answer);
    } else {
      isCorrect = normalize(qData.correctAnswer) === normalize(answer);
    }

    const updated: Partial<ChallengeEntry> = {
      attemptedQuestions: [...entry.attemptedQuestions, questionId],
    };
    let correctCount = entry.correctCount;
    if (isCorrect) {
      correctCount += 1;
      updated.correctCount = correctCount;
    }

    let completed = entry.completed;
    let won = entry.won;
    if (correctCount >= required) {
      completed = true;
      won = true;
      updated.completed = true;
      updated.won = true;
      updated.completedAt = new Date().toISOString();
    }

    const questionsSnap = await db
      .collection('daily-challenges')
      .doc(challengeId)
      .collection('questions')
      .get();
    const totalQuestions = questionsSnap.size;
    const attemptedAfter = (entry.attemptedQuestions?.length || 0) + 1;
    if (attemptedAfter >= totalQuestions && !completed) {
      completed = true;
      won = correctCount >= required;
      updated.completed = true;
      updated.won = won;
      updated.completedAt = new Date().toISOString();
    }

    await entryRef.set(updated, { merge: true });

    if (won && !entry.won) {
      const balanceRef = db.collection('balance').doc(userId);
      await db.runTransaction(async tx => {
        const balDoc = await tx.get(balanceRef);
        const current = balDoc.exists ? balDoc.data()?.amount || 0 : 0;
        tx.set(
          balanceRef,
          {
            amount: current + reward,
            currency: 'INR',
            lastUpdated: new Date().toISOString(),
          },
          { merge: true },
        );
      });
    }

    res.json({
      correct: isCorrect,
      correctCount,
      completed,
      won,
      timeLimit,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};
