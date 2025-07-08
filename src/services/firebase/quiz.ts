import { collection, doc, getDocs, query, setDoc, where, addDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { updateUserBalance } from './balance';
import { getClientIP } from '@/utils/ipDetection';
import { getDeviceId } from '@/utils/deviceId';
import axios from 'axios';
import { getAuthToken } from '../api/auth';
import { refreshAdminToken } from '../api/adminAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getApiEndpoint = (endpoint: string) => {
  const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
  return `${baseUrl}${endpoint}`;
};

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const getSubCategories = async (categoryId: string): Promise<SubCategory[]> => {
  try {
    const subCategoriesRef = collection(db, 'sub-categories');
    const q = query(subCategoriesRef, where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SubCategory[];
  } catch (error) {
    console.error('Error fetching sub categories:', error);
    return [];
  }
};

export const createSubCategory = async (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubCategory | null> => {
  try {
    const subCategoriesRef = collection(db, 'sub-categories');
    const docRef = await addDoc(subCategoriesRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const newDoc = await getDoc(docRef);
    return {
      id: newDoc.id,
      ...newDoc.data()
    } as SubCategory;
  } catch (error) {
    console.error('Error creating sub category:', error);
    return null;
  }
};

export const updateSubCategory = async (id: string, data: Partial<Omit<SubCategory, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const subCategoryRef = doc(db, 'sub-categories', id);
    await updateDoc(subCategoryRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating sub category:', error);
    return false;
  }
};

export const deleteSubCategory = async (id: string): Promise<boolean> => {
  try {
    const subCategoryRef = doc(db, 'sub-categories', id);
    await deleteDoc(subCategoryRef);
    return true;
  } catch (error) {
    console.error('Error deleting sub category:', error);
    return false;
  }
};

export const getQuizCategories = async (): Promise<QuizCategory[]> => {
  try {
    const categoriesRef = collection(db, 'quiz-categories');
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuizCategory[];
  } catch (error) {
    console.error('Error fetching quiz categories:', error);
    return [];
  }
};

export const createQuizCategory = async (data: Omit<QuizCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<QuizCategory | null> => {
  try {
    const categoriesRef = collection(db, 'quiz-categories');
    const docRef = await addDoc(categoriesRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const newDoc = await getDoc(docRef);
    return {
      id: newDoc.id,
      ...newDoc.data()
    } as QuizCategory;
  } catch (error) {
    console.error('Error creating quiz category:', error);
    return null;
  }
};

export const updateQuizCategory = async (id: string, data: Partial<Omit<QuizCategory, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const categoryRef = doc(db, 'quiz-categories', id);
    await updateDoc(categoryRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating quiz category:', error);
    return false;
  }
};

export const deleteQuizCategory = async (id: string): Promise<boolean> => {
  const batch = writeBatch(db);
  try {
    // 1. Get all subcategories for this category
    const subCategoriesRef = collection(db, 'sub-categories');
    const subCategoriesQuery = query(subCategoriesRef, where('categoryId', '==', id));
    const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
    
    // 2. For each subcategory, delete its quizzes and the subcategory itself
    for (const subCategoryDoc of subCategoriesSnapshot.docs) {
      const subCategoryId = subCategoryDoc.id;
      
      // Get all quizzes in this subcategory
      const quizzesRef = collection(db, 'quizzes');
      const quizzesQuery = query(quizzesRef, 
        where('categoryId', '==', id),
        where('subcategoryId', '==', subCategoryId)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      // Delete all quizzes and their questions
      for (const quizDoc of quizzesSnapshot.docs) {
        const quizRef = doc(db, 'quizzes', quizDoc.id);
        const questionsRef = collection(quizRef, 'questions');
        const questionsSnapshot = await getDocs(questionsRef);
        
        // Delete all questions in the quiz
        questionsSnapshot.docs.forEach(questionDoc => {
          batch.delete(questionDoc.ref);
        });
        
        // Delete the quiz document
        batch.delete(quizRef);
      }
      
      // Delete the subcategory document
      batch.delete(subCategoryDoc.ref);
    }
    
    // 3. Delete the main category document
    const categoryRef = doc(db, 'quiz-categories', id);
    batch.delete(categoryRef);
    
    // 4. Commit all deletions
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting quiz category:', error);
    return false;
  }
};

// --- Quiz Interfaces and Functions ---

export interface Quiz {
  id: string;
  categoryId: string;
  subcategoryId: string;
  title: string;
  description: string;
  questions?: QuizQuestion[];
  sequence: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QuizQuestion {
  id: string; // This will be the Firestore document ID of the question
  text: string;
  options: QuizOption[];
  correctAnswer: string;
}

export interface QuizOption {
  id: string; // Client-side identifier for the option
  text: string;
}

export const getQuizzesByCategory = async (categoryId: string, subcategoryId?: string): Promise<Quiz[]> => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    let q;
    
    if (subcategoryId) {
      q = query(quizzesRef, 
        where('categoryId', '==', categoryId),
        where('subcategoryId', '==', subcategoryId)
      );
    } else {
      q = query(quizzesRef, where('categoryId', '==', categoryId));
    }
    
    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Quiz[];
    
    // Sort quizzes by createdAt in descending order (newest first)
    return quizzes.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return [];
  }
};

export const createQuiz = async (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz | null> => {
  const batch = writeBatch(db);
  try {
    const inputQuestions = data.questions || [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { questions, ...quizDetails } = data; // Separate questions from other quiz data

    // Create main quiz document
    const quizzesColRef = collection(db, 'quizzes');
    const newQuizDocRef = doc(quizzesColRef); // Generate ID upfront for the main quiz document

    batch.set(newQuizDocRef, {
      ...quizDetails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Add questions to the subcollection 'quizzes/{newQuizId}/questions'
    const questionsSubCollectionRef = collection(newQuizDocRef, 'questions');
    inputQuestions.forEach(question => {
      const questionDocRef = doc(questionsSubCollectionRef); // Firestore auto-ID for the question document
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...questionData } = question; // Remove client-side 'id' if present, use Firestore ID for the doc
      batch.set(questionDocRef, questionData);
    });

    await batch.commit();
    
    const newQuizDocSnapshot = await getDoc(newQuizDocRef);
    
    // Fetch the newly created questions from subcollection to include their Firestore-generated IDs
    const createdQuestionsSnapshot = await getDocs(questionsSubCollectionRef);
    const fetchedQuestions = createdQuestionsSnapshot.docs.map(qDoc => ({
      id: qDoc.id,
      ...qDoc.data()
    })) as QuizQuestion[];

    return {
      id: newQuizDocSnapshot.id,
      ...(newQuizDocSnapshot.data() as Omit<Quiz, 'id' | 'questions'>),
      questions: fetchedQuestions
    } as Quiz;
  } catch (error) {
    console.error('Error creating quiz:', error);
    return null;
  }
};

export const updateQuiz = async (id: string, data: Partial<Omit<Quiz, 'id' | 'createdAt'>>): Promise<boolean> => {
  const batch = writeBatch(db);
  try {
    const quizRef = doc(db, 'quizzes', id);
    const newQuestions = data.questions; // Keep a reference to the questions array from data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { questions, ...quizDetailsToUpdate } = data; // questions is destructured here to remove it from quizDetailsToUpdate

    const updatePayload: any = { ...quizDetailsToUpdate };
    updatePayload.updatedAt = serverTimestamp(); // Always update the timestamp
    
    // Update main quiz document details (if any)
    // Batch update will handle if quizDetailsToUpdate is empty (only timestamp changes)
    batch.update(quizRef, updatePayload);

    // If newQuestions array is provided (even an empty array), replace the entire subcollection
    if (newQuestions !== undefined) {
      const questionsSubCollectionRef = collection(quizRef, 'questions');
      
      // 1. Delete all existing questions in the subcollection
      const existingQuestionsSnapshot = await getDocs(questionsSubCollectionRef);
      existingQuestionsSnapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });

      // 2. Add new questions (if any)
      if (newQuestions.length > 0) {
        newQuestions.forEach(question => {
          const questionDocRef = doc(questionsSubCollectionRef); // Firestore auto-ID for new questions
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: questionId, ...questionData } = question; // Remove client-side 'id', use Firestore ID
          batch.set(questionDocRef, questionData);
        });
      }
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error updating quiz:', error);
    return false;
  }
};

export const deleteQuiz = async (id: string): Promise<boolean> => {
  const batch = writeBatch(db);
  try {
    const quizRef = doc(db, 'quizzes', id);
    const questionsRef = collection(quizRef, 'questions');

    // Delete all documents in the 'questions' subcollection
    const questionsSnapshot = await getDocs(questionsRef);
    questionsSnapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });

    // Delete the main quiz document
    batch.delete(quizRef);
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return false;
  }
};

export const getQuizById = async (id: string): Promise<Quiz | null> => {
  try {
    const quizRef = doc(db, 'quizzes', id);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      return null;
    }
    
    // quizData will not have 'questions' field from the main document
    const quizData = quizDoc.data() as Omit<Quiz, 'id' | 'questions'>; 
    
    // Fetch questions from the 'questions' subcollection
    const questionsPath = `quizzes/${id}/questions`;
    const questionsColRef = collection(db, questionsPath);
    const questionsSnapshot = await getDocs(questionsColRef);
    
    const allQuestions = questionsSnapshot.docs.map(qDoc => ({
      id: qDoc.id,
      ...qDoc.data()
    })) as QuizQuestion[];
    
    // Shuffle the questions array using Fisher-Yates algorithm
    const shuffledQuestions = [...allQuestions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }
    
    // Take only the first 50 questions, or all questions if less than 50
    const selectedQuestions = shuffledQuestions.slice(0, 50);
    
    return {
      id: quizDoc.id,
      ...quizData,
      questions: selectedQuestions // Add fetched, shuffled, and sliced questions
    } as Quiz;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return null;
  }
};

export const getQuizQuestions = async (quizId: string): Promise<QuizQuestion[]> => {
  try {
    const questionsPath = `quizzes/${quizId}/questions`;
    const questionsRef = collection(db, questionsPath);
    const questionsSnapshot = await getDocs(questionsRef);
    
    return questionsSnapshot.docs.map(qDoc => ({
      id: qDoc.id,
      ...qDoc.data()
    })) as QuizQuestion[];
  } catch (error) {
    console.error(`Error fetching questions for quiz ${quizId}:`, error);
    return [];
  }
};

export const seedQuizData = async () => {
  // Implementation here should now create quiz documents
  // and then populate their 'questions' subcollections.
  console.log('Seeding quiz data - adapt to new subcollection structure for questions.');
};


// --- MegaTest Interfaces and Functions (Restored to original from your first post) ---

export interface MegaTest {
  id: string;
  title: string;
  description: string;
  registrationStartTime: Timestamp;
  registrationEndTime: Timestamp;
  testStartTime: Timestamp;
  testEndTime: Timestamp;
  resultTime: Timestamp;
  totalQuestions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'upcoming' | 'registration' | 'ongoing' | 'completed';
  entryFee: number;
  timeLimit: number; // Time limit in minutes
  questions?: QuizQuestion[];
}

export interface MegaTestQuestion {
  id: string;
  text: string;
  options: QuizOption[]; // Reusing QuizOption for consistency
  correctAnswer: string;
}

export interface MegaTestParticipant {
  userId: string;
  registeredAt: Timestamp;
  ipAddress?: string;
  lastSeenIP?: string;
  // Original did not have entryFeePaid, but it was in registerForMegaTest.
  // Keeping interface as per original, but registerForMegaTest will set it.
  // This might be an inconsistency in the original code.
  // For now, matching the provided interface.
}

export interface MegaTestLeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
  submittedAt: Timestamp;
  completionTime: number; // Time taken to complete the quiz in seconds
}

export interface MegaTestPrize {
  rank: number;
  prize: string;
}

export const getMegaTests = async (): Promise<MegaTest[]> => {
  try {
    const response = await axios.get(getApiEndpoint('/mega-tests'));
    return response.data as MegaTest[];
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    return [];
  }
};

export const getMegaTestById = async (id: string): Promise<{ megaTest: MegaTest | null, questions: MegaTestQuestion[] }> => {
  try {
    const response = await axios.get(getApiEndpoint(`/mega-tests/${id}`));
    return response.data as { megaTest: MegaTest | null; questions: MegaTestQuestion[] };
  } catch (error) {
    console.error('Error fetching mega test:', error);
    return { megaTest: null, questions: [] };
  }
};

export const getMegaTestPrizes = async (megaTestId: string): Promise<MegaTestPrize[]> => {
  try {
    const response = await axios.get(getApiEndpoint(`/mega-tests/${megaTestId}/prizes`));
    return response.data as MegaTestPrize[];
  } catch (error) {
    console.error('Error fetching prizes:', error);
    return [];
  }
};

export const createMegaTest = async (data: Omit<MegaTest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'totalQuestions'> & {
  questions: MegaTestQuestion[]; // Original type
  prizes: MegaTestPrize[];
}): Promise<MegaTest | null> => {
  try {
    const token = await refreshAdminToken();
    const response = await axios.post(getApiEndpoint('/mega-tests'), data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data as MegaTest;
  } catch (error) {
    console.error('Error creating mega test:', error);
    return null;
  }
};

export const registerForMegaTest = async (megaTestId: string, userId: string, username: string, email: string): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    await axios.post(
      getApiEndpoint(`/mega-tests/${megaTestId}/register`),
      { userId, username, email },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (error: any) {
    console.error('Error registering for mega test:', error);
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

export const isUserRegistered = async (megaTestId: string, userId: string): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(
      getApiEndpoint(`/mega-tests/${megaTestId}/is-registered/${userId}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.registered as boolean;
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
};

export const hasUserSubmittedMegaTest = async (megaTestId: string, userId: string): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(
      getApiEndpoint(`/mega-tests/${megaTestId}/has-submitted/${userId}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.submitted as boolean;
  } catch (error) {
    console.error('Error checking submission status:', error);
    return false;
  }
};

export const markMegaTestStarted = async (megaTestId: string, userId: string): Promise<void> => {
  try {
    const token = await getAuthToken();
    await axios.post(
      getApiEndpoint(`/mega-tests/${megaTestId}/start`),
      { userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    console.error('Error recording mega test start time:', error);
  }
};

export const submitMegaTestResult = async (
  megaTestId: string,
  userId: string,
  score: number,
  completionTime: number // Time taken to complete the quiz in seconds
): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    await axios.post(
      getApiEndpoint(`/mega-tests/${megaTestId}/submit`),
      { userId, score, completionTime },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (error) {
    console.error('Error submitting mega test result:', error);
    return false;
  }
};


export const getMegaTestLeaderboard = async (megaTestId: string): Promise<MegaTestLeaderboardEntry[]> => {
  try {
    const response = await axios.get(getApiEndpoint(`/mega-tests/${megaTestId}/leaderboard`));
    return response.data as MegaTestLeaderboardEntry[];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

export const updateMegaTest = async (
  id: string,
  data: Partial<Omit<MegaTest, 'id' | 'createdAt' | 'status'>> & {
    questions?: MegaTestQuestion[]; // Original type
    prizes?: MegaTestPrize[];
  }
): Promise<boolean> => {
  try {
    const token = await refreshAdminToken();
    await axios.put(getApiEndpoint(`/mega-tests/${id}`), data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    console.error('Error updating mega test:', error);
    return false;
  }
};

export const deleteMegaTest = async (megaTestId: string): Promise<boolean> => {
  try {
    const token = await refreshAdminToken();
    await axios.delete(getApiEndpoint(`/mega-tests/${megaTestId}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    console.error('Error deleting mega test:', error);
    return false;
  }
};


export const getMegaTestPrizePool = async (megaTestId: string): Promise<number> => {
  try {
    const response = await axios.get(getApiEndpoint(`/mega-tests/${megaTestId}/prize-pool`));
    return response.data.prizePool as number;
  } catch (error) {
    console.error('Error calculating prize pool:', error);
    return 0;
  }
};

export const getMegaTestParticipantCount = async (megaTestId: string): Promise<number> => {
  try {
    const response = await axios.get(getApiEndpoint(`/mega-tests/${megaTestId}/participant-count`));
    return response.data.count as number;
  } catch (error) {
    console.error('Error getting participant count:', error);
    return 0;
  }
};

/**
 * Admin function to add or update a leaderboard entry for a MegaTest.
 * Allows specifying any userId, score, and completionTime. Recalculates ranks for all entries.
 */
export const adminAddOrUpdateLeaderboardEntry = async (
  megaTestId: string,
  userId: string,
  score: number,
  completionTime: number // Time taken to complete the quiz in seconds
): Promise<boolean> => {
  try {
    const token = await refreshAdminToken();
    await axios.post(
      getApiEndpoint(`/mega-tests/${megaTestId}/leaderboard`),
      { userId, score, completionTime },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (error) {
    console.error('Error adding/updating leaderboard entry (admin):', error);
    return false;
  }
};

export const getMegaTestParticipants = async (megaTestId: string): Promise<{ userId: string; username: string; email: string; registeredAt: any; ipAddress?: string, lastSeenIP?: string, deviceId?: string }[]> => {
  try {
    const token = await refreshAdminToken();
    const response = await axios.get(getApiEndpoint(`/mega-tests/${megaTestId}/participants`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data as any[];
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
};
