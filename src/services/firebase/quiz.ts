import { collection, doc, getDocs, query, setDoc, where, addDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { getMegaTestLeaderboard as fetchLeaderboard, MegaTestLeaderboardEntry } from '../api/megaTest';
import { updateUserBalance } from './balance';
import { getClientIP } from '@/utils/ipDetection';
import { getDeviceId } from '@/utils/deviceId';

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
  practiceUrl?: string;
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
  maxParticipants?: number;
  enabled?: boolean;
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
  prize: number;
}

export const getMegaTests = async (): Promise<MegaTest[]> => {
  try {
    const megaTestsRef = collection(db, 'mega-tests');
    const snapshot = await getDocs(megaTestsRef);
    const megaTests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MegaTest[];
    
    // Sort by createdAt timestamp in descending order (newest first)
    return megaTests.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime; // Descending order (newest first)
    });
  } catch (error) {
    console.error('Error fetching mega tests:', error);
    return [];
  }
};

export const getMegaTestById = async (id: string): Promise<{ megaTest: MegaTest | null, questions: MegaTestQuestion[] }> => {
  try {
    const megaTestRef = doc(db, 'mega-tests', id);
    const questionsRef = collection(db, 'mega-tests', id, 'questions');
    
    const [megaTestDoc, questionsSnapshot] = await Promise.all([
      getDoc(megaTestRef),
      getDocs(questionsRef)
    ]);
    
    if (!megaTestDoc.exists()) {
      return { megaTest: null, questions: [] };
    }
    
    const questions = questionsSnapshot.docs.map(doc => ({ // Using doc directly as in original
      id: doc.id,
      ...doc.data()
    })) as MegaTestQuestion[];
    
    return {
      megaTest: {
        id: megaTestDoc.id,
        ...megaTestDoc.data()
      } as MegaTest,
      questions
    };
  } catch (error) {
    console.error('Error fetching mega test:', error);
    return { megaTest: null, questions: [] };
  }
};

export const getMegaTestPrizes = async (megaTestId: string): Promise<MegaTestPrize[]> => {
  try {
    const prizesRef = collection(db, 'mega-tests', megaTestId, 'prizes');
    const snapshot = await getDocs(prizesRef);
    return snapshot.docs
      .map(doc => doc.data() as MegaTestPrize)
      .sort((a, b) => a.rank - b.rank);
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
    const batch = writeBatch(db);
    const megaTestsRef = collection(db, 'mega-tests');
    const newMegaTestRef = doc(megaTestsRef);
    
    // Create main mega test document
    const { prizes, ...megaTestData } = data; // Original destructuring
    batch.set(newMegaTestRef, {
      ...megaTestData, // This will include data.questions as it's part of megaTestData
      totalQuestions: data.questions.length,
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeLimit: data.timeLimit || 60,
      maxParticipants: data.maxParticipants ?? null,
      practiceUrl: data.practiceUrl || '',
      enabled: false
    });
    
    // Create questions in subcollection
    data.questions.forEach(question => { // Using data.questions directly
      const questionRef = doc(collection(newMegaTestRef, 'questions'));
      batch.set(questionRef, question); // Storing the whole question object, including its original id field if present
    });

    // Create prizes in subcollection
    prizes.forEach(prize => {
      const prizeRef = doc(collection(newMegaTestRef, 'prizes'));
      batch.set(prizeRef, prize);
    });
    
    await batch.commit();
    
    const newDoc = await getDoc(newMegaTestRef);
    return {
      id: newDoc.id,
      ...newDoc.data()
    } as MegaTest;
  } catch (error) {
    console.error('Error creating mega test:', error);
    return null;
  }
};

export const registerForMegaTest = async (megaTestId: string, userId: string, username: string, email: string): Promise<boolean> => {
  try {
    const megaTestRef = doc(db, 'mega-tests', megaTestId);
    const megaTestDoc = await getDoc(megaTestRef);
    
    if (!megaTestDoc.exists()) {
      throw new Error('Mega test not found');
    }
    
    const megaTest = megaTestDoc.data() as MegaTest;
    const entryFee = megaTest.entryFee || 0;
    
    const balanceRef = doc(db, 'balance', userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (!balanceDoc.exists()) {
      throw new Error('User balance not found');
    }
    
    const currentBalance = balanceDoc.data()!.amount || 0; // Added non-null assertion as per original logic expectation
    
    if (currentBalance < entryFee) {
      throw new Error(`Insufficient balance. Required: ₹${entryFee}, Available: ₹${currentBalance}`);
    }
    
    const batch = writeBatch(db);
    
    if (entryFee > 0) {
      batch.update(balanceRef, {
        amount: currentBalance - entryFee,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    const ipAddress = await getClientIP();
    const deviceId = getDeviceId();
    
    const participantRef = doc(collection(db, 'mega-tests', megaTestId, 'participants'), userId);
    batch.set(participantRef, {
      userId,
      username,
      email,
      registeredAt: serverTimestamp(),
      entryFeePaid: entryFee, // This field was in original logic but not MegaTestParticipant interface
      ipAddress: ipAddress,
      lastSeenIP: ipAddress,
      deviceId: deviceId
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error registering for mega test:', error);
    throw error; 
  }
};

export const isUserRegistered = async (megaTestId: string, userId: string): Promise<boolean> => {
  try {
    const participantRef = doc(collection(db, 'mega-tests', megaTestId, 'participants'), userId);
    const participantDoc = await getDoc(participantRef);
    return participantDoc.exists();
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
};

export const hasUserSubmittedMegaTest = async (megaTestId: string, userId: string): Promise<boolean> => {
  try {
    const leaderboardRef = doc(collection(db, 'mega-tests', megaTestId, 'leaderboard'), userId);
    const leaderboardDoc = await getDoc(leaderboardRef);
    return leaderboardDoc.exists();
  } catch (error) {
    console.error('Error checking submission status:', error);
    return false;
  }
};

export const submitMegaTestResult = async (
  megaTestId: string, 
  userId: string, 
  score: number,
  completionTime: number // Time taken to complete the quiz in seconds
): Promise<boolean> => {
  try {
    const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
    const leaderboardSnapshot = await getDocs(leaderboardRef);
    const leaderboard = leaderboardSnapshot.docs.map(doc => doc.data() as MegaTestLeaderboardEntry);
    
    const newEntry = {
      userId,
      score,
      rank: 0, // Will be recalculated
      submittedAt: serverTimestamp() as Timestamp,
      completionTime
    };
    leaderboard.push(newEntry);
    
    leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completionTime - b.completionTime;
    });
    
    const batch = writeBatch(db);
    leaderboard.forEach((entry, index) => {
      const entryRef = doc(leaderboardRef, entry.userId);
      batch.set(entryRef, {
        ...entry,
        rank: index + 1
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error submitting mega test result:', error);
    return false;
  }
};


export const getMegaTestLeaderboard = async (megaTestId: string): Promise<MegaTestLeaderboardEntry[]> => {
  try {
    return await fetchLeaderboard(megaTestId);
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
    const batch = writeBatch(db);
    const megaTestRef = doc(db, 'mega-tests', id);

  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
    practiceUrl: data.practiceUrl ?? ''
  };

    if (data.questions) {
      updateData.totalQuestions = data.questions.length;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { questions, prizes, ...mainDocData } = updateData; // questions and prizes are removed here
    batch.update(megaTestRef, mainDocData); // mainDocData is correct

    if (data.questions) { // Use original data.questions
      const questionsRef = collection(megaTestRef, 'questions');
      const existingQuestions = await getDocs(questionsRef);
      existingQuestions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      data.questions.forEach(question => {
        const questionRef = doc(collection(megaTestRef, 'questions'));
        batch.set(questionRef, question); // Storing whole question object
      });
    }

    if (data.prizes) { // Use original data.prizes
      const prizesRef = collection(megaTestRef, 'prizes');
      const existingPrizes = await getDocs(prizesRef);
      existingPrizes.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      data.prizes.forEach(prize => {
        const prizeRef = doc(collection(megaTestRef, 'prizes'));
        batch.set(prizeRef, prize);
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error updating mega test:', error);
    return false;
  }
};

export const deleteMegaTest = async (megaTestId: string): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    const megaTestRef = doc(db, 'mega-tests', megaTestId);

    // Delete questions subcollection
    const questionsRef = collection(megaTestRef, 'questions');
    const questionsSnapshot = await getDocs(questionsRef);
    questionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete participants subcollection
    const participantsRef = collection(megaTestRef, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    participantsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete leaderboard subcollection
    const leaderboardRef = collection(megaTestRef, 'leaderboard');
    const leaderboardSnapshot = await getDocs(leaderboardRef);
    leaderboardSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete prizes subcollection
    const prizesRef = collection(megaTestRef, 'prizes');
    const prizesSnapshot = await getDocs(prizesRef);
    prizesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the main mega test document
    batch.delete(megaTestRef);

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting mega test:', error);
    return false;
  }
};

export const copyMegaTest = async (megaTestId: string): Promise<MegaTest | null> => {
  try {
    const originalRef = doc(db, 'mega-tests', megaTestId);
    const originalDoc = await getDoc(originalRef);
    if (!originalDoc.exists()) {
      return null;
    }

    const originalData = originalDoc.data() as any;

    const batch = writeBatch(db);
    const newRef = doc(collection(db, 'mega-tests'));

    batch.set(newRef, {
      title: originalData.title,
      description: originalData.description,
      practiceUrl: originalData.practiceUrl || '',
      registrationStartTime: originalData.registrationStartTime,
      registrationEndTime: originalData.registrationEndTime,
      testStartTime: originalData.testStartTime,
      testEndTime: originalData.testEndTime,
      resultTime: originalData.resultTime,
      entryFee: originalData.entryFee,
      timeLimit: originalData.timeLimit || 60,
      maxParticipants: originalData.maxParticipants ?? null,
      enabled: false,
      totalQuestions: 0,
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const prizesSnap = await getDocs(collection(originalRef, 'prizes'));
    prizesSnap.docs.forEach(prizeDoc => {
      const prizeRef = doc(collection(newRef, 'prizes'));
      batch.set(prizeRef, prizeDoc.data());
    });

    await batch.commit();

    const newDoc = await getDoc(newRef);
    return { id: newDoc.id, ...(newDoc.data() as any) } as MegaTest;
  } catch (error) {
    console.error('Error copying mega test:', error);
    return null;
  }
};


export const getMegaTestPrizePool = async (megaTestId: string): Promise<number> => {
  try {
    const participantsRef = collection(db, 'mega-tests', megaTestId, 'participants');
    const snapshot = await getDocs(participantsRef);
    const participants = snapshot.docs.map(doc => doc.data()); // as in original
    // Original logic for reduce: participant.entryFeePaid.
    // This field is set in registerForMegaTest but not in MegaTestParticipant interface.
    // Assuming participants data structure will have entryFeePaid due to registerForMegaTest.
    const totalPrizePool = participants.reduce((total, participant) => total + (participant.entryFeePaid || 0), 0);
    return totalPrizePool;
  } catch (error) {
    console.error('Error calculating prize pool:', error);
    return 0;
  }
};

export const getMegaTestParticipantCount = async (megaTestId: string): Promise<number> => {
  try {
    const participantsRef = collection(db, 'mega-tests', megaTestId, 'participants');
    const snapshot = await getDocs(participantsRef);
    return snapshot.size;
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
    const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
    const leaderboardSnapshot = await getDocs(leaderboardRef);
    let leaderboard = leaderboardSnapshot.docs.map(doc => doc.data() as MegaTestLeaderboardEntry);

    // Remove any existing entry for this userId
    leaderboard = leaderboard.filter(entry => entry.userId !== userId);

    // Add the new/updated entry
    const newEntry: MegaTestLeaderboardEntry = {
      userId,
      score,
      rank: 0, // Will be recalculated
      submittedAt: serverTimestamp() as Timestamp,
      completionTime
    };
    leaderboard.push(newEntry);

    // Sort and assign ranks
    leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completionTime - b.completionTime;
    });

    const batch = writeBatch(db);
    leaderboard.forEach((entry, index) => {
      const entryRef = doc(leaderboardRef, entry.userId);
      batch.set(entryRef, {
        ...entry,
        rank: index + 1
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error adding/updating leaderboard entry (admin):', error);
    return false;
  }
};

export const getMegaTestParticipants = async (megaTestId: string): Promise<{ userId: string; username: string; email: string; registeredAt: any; ipAddress?: string, lastSeenIP?: string, deviceId?: string }[]> => {
  try {
    const participantsRef = collection(db, 'mega-tests', megaTestId, 'participants');
    const snapshot = await getDocs(participantsRef);
    return snapshot.docs.map(doc => {
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
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
};