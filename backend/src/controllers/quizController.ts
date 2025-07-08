import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getQuizCategories = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('quiz-categories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (error) {
    console.error('Error fetching quiz categories:', error);
    res.status(500).json({ error: 'Failed to fetch quiz categories' });
  }
};

export const getSubCategories = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const snapshot = await db
      .collection('sub-categories')
      .where('categoryId', '==', categoryId)
      .get();
    const subCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(subCategories);
  } catch (error) {
    console.error('Error fetching sub categories:', error);
    res.status(500).json({ error: 'Failed to fetch sub categories' });
  }
};

export const getQuizzesByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId, subcategoryId } = req.query;
    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({ error: 'categoryId is required' });
    }
    let queryRef: FirebaseFirestore.Query = db
      .collection('quizzes')
      .where('categoryId', '==', categoryId);
    if (subcategoryId && typeof subcategoryId === 'string') {
      queryRef = queryRef.where('subcategoryId', '==', subcategoryId);
    }
    const snapshot = await queryRef.get();
    const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizDoc = await db.collection('quizzes').doc(quizId).get();
    if (!quizDoc.exists) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const questionsSnapshot = await db
      .collection('quizzes')
      .doc(quizId)
      .collection('questions')
      .get();
    const questions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ id: quizDoc.id, ...quizDoc.data(), questions });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};
