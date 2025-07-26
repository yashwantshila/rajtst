import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { slugify } from '../utils/slugify.js';

const findCategoryIdBySlug = async (slug: string): Promise<string | null> => {
  const snapshot = await db.collection('quiz-categories').get();
  const doc = snapshot.docs.find(d => slugify((d.data() as any).title || '') === slug);
  return doc ? doc.id : null;
};

const findSubCategoryIdBySlug = async (categoryId: string, slug: string): Promise<string | null> => {
  const snapshot = await db
    .collection('sub-categories')
    .where('categoryId', '==', categoryId)
    .get();
  const doc = snapshot.docs.find(d => slugify((d.data() as any).title || '') === slug);
  return doc ? doc.id : null;
};

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
    let { categoryId, categorySlug } = req.params as { categoryId?: string; categorySlug?: string };

    if (!categoryId && categorySlug) {
      categoryId = await findCategoryIdBySlug(categorySlug) || undefined;
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId or categorySlug is required' });
    }

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
    let { categoryId, subcategoryId } = req.query as { categoryId?: string; subcategoryId?: string };
    const { categorySlug, subcategorySlug } = req.params as { categorySlug?: string; subcategorySlug?: string };

    if (!categoryId && categorySlug) {
      categoryId = await findCategoryIdBySlug(categorySlug) || undefined;
    }

    if (categoryId && !subcategoryId && subcategorySlug) {
      const subId = await findSubCategoryIdBySlug(categoryId, subcategorySlug);
      if (subId) subcategoryId = subId;
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId or categorySlug is required' });
    }

    let queryRef: FirebaseFirestore.Query = db
      .collection('quizzes')
      .where('categoryId', '==', categoryId);
    if (subcategoryId) {
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
