import { collection, doc, getDocs, query, setDoc, where, addDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { updateUserBalance } from './balance';

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  try {
    const categoryRef = doc(db, 'quiz-categories', id);
    await deleteDoc(categoryRef);
    return true;
  } catch (error) {
    console.error('Error deleting quiz category:', error);
    return false;
  }
};

export interface Quiz {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctAnswer: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export const getQuizzesByCategory = async (categoryId: string): Promise<Quiz[]> => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const q = query(quizzesRef, where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Quiz[];
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return [];
  }
};

export const createQuiz = async (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz | null> => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const docRef = await addDoc(quizzesRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const newDoc = await getDoc(docRef);
    return {
      id: newDoc.id,
      ...newDoc.data()
    } as Quiz;
  } catch (error) {
    console.error('Error creating quiz:', error);
    return null;
  }
};

export const updateQuiz = async (id: string, data: Partial<Omit<Quiz, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const quizRef = doc(db, 'quizzes', id);
    await updateDoc(quizRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating quiz:', error);
    return false;
  }
};

export const deleteQuiz = async (id: string): Promise<boolean> => {
  try {
    const quizRef = doc(db, 'quizzes', id);
    await deleteDoc(quizRef);
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
    
    const quizData = quizDoc.data();
    const allQuestions = quizData.questions || [];
    
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
      questions: selectedQuestions
    } as Quiz;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return null;
  }
};

export const getQuizQuestions = async (quizId: string) => {
  return [];
};

export const seedQuizData = async () => {
  // Implementation here
};

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
}

export interface MegaTestQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctAnswer: string;
}

export interface MegaTestParticipant {
  userId: string;
  registeredAt: Timestamp;
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
    const megaTestsRef = collection(db, 'mega-tests');
    const snapshot = await getDocs(megaTestsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MegaTest[];
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
    
    const questions = questionsSnapshot.docs.map(doc => ({
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
  questions: MegaTestQuestion[];
  prizes: MegaTestPrize[];
}): Promise<MegaTest | null> => {
  try {
    const batch = writeBatch(db);
    const megaTestsRef = collection(db, 'mega-tests');
    const newMegaTestRef = doc(megaTestsRef);
    
    // Create main mega test document
    const { prizes, ...megaTestData } = data;
    batch.set(newMegaTestRef, {
      ...megaTestData,
      totalQuestions: data.questions.length,
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeLimit: data.timeLimit || 60 // Default to 60 minutes if not specified
    });
    
    // Create questions in subcollection
    data.questions.forEach(question => {
      const questionRef = doc(collection(newMegaTestRef, 'questions'));
      batch.set(questionRef, question);
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

export const registerForMegaTest = async (megaTestId: string, userId: string): Promise<boolean> => {
  try {
    // Get the mega test details to check entry fee
    const megaTestRef = doc(db, 'mega-tests', megaTestId);
    const megaTestDoc = await getDoc(megaTestRef);
    
    if (!megaTestDoc.exists()) {
      throw new Error('Mega test not found');
    }
    
    const megaTest = megaTestDoc.data() as MegaTest;
    const entryFee = megaTest.entryFee || 0;
    
    // Get user's balance
    const balanceRef = doc(db, 'balance', userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (!balanceDoc.exists()) {
      throw new Error('User balance not found');
    }
    
    const currentBalance = balanceDoc.data().amount || 0;
    
    // Check if user has sufficient balance
    if (currentBalance < entryFee) {
      throw new Error(`Insufficient balance. Required: ₹${entryFee}, Available: ₹${currentBalance}`);
    }
    
    // Start a batch write
    const batch = writeBatch(db);
    
    // Deduct entry fee from user's balance
    if (entryFee > 0) {
      batch.update(balanceRef, {
        amount: currentBalance - entryFee,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    // Register user for the mega test
    const participantRef = doc(collection(db, 'mega-tests', megaTestId, 'participants'), userId);
    batch.set(participantRef, {
      userId,
      registeredAt: serverTimestamp(),
      entryFeePaid: entryFee
    });
    
    // Commit the batch
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
    
    // Add new result
    const newEntry = {
      userId,
      score,
      rank: 0,
      submittedAt: serverTimestamp() as Timestamp,
      completionTime
    };
    leaderboard.push(newEntry);
    
    // Sort by score (descending) and then by completion time (ascending)
    leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // Higher score first
      }
      // If scores are equal, faster completion gets higher rank
      return a.completionTime - b.completionTime;
    });
    
    // Update all leaderboard entries with new ranks
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
    const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
    const snapshot = await getDocs(leaderboardRef);
    return snapshot.docs
      .map(doc => doc.data() as MegaTestLeaderboardEntry)
      .sort((a, b) => a.rank - b.rank);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

export const updateMegaTest = async (
  id: string,
  data: Partial<Omit<MegaTest, 'id' | 'createdAt' | 'status'>> & { 
    questions?: MegaTestQuestion[];
    prizes?: MegaTestPrize[];
  }
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    const megaTestRef = doc(db, 'mega-tests', id);

    // Update main mega test document
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    };

    // If questions are provided, update totalQuestions
    if (data.questions) {
      updateData.totalQuestions = data.questions.length;
    }

    // Remove questions and prizes from main document update
    const { questions, prizes, ...mainDocData } = updateData;
    batch.update(megaTestRef, mainDocData);

    // If questions are provided, update questions subcollection
    if (questions) {
      // Delete existing questions
      const questionsRef = collection(megaTestRef, 'questions');
      const existingQuestions = await getDocs(questionsRef);
      existingQuestions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new questions
      questions.forEach(question => {
        const questionRef = doc(collection(megaTestRef, 'questions'));
        batch.set(questionRef, question);
      });
    }

    // If prizes are provided, update prizes subcollection
    if (prizes) {
      // Delete existing prizes
      const prizesRef = collection(megaTestRef, 'prizes');
      const existingPrizes = await getDocs(prizesRef);
      existingPrizes.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new prizes
      prizes.forEach(prize => {
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

export const getMegaTestPrizePool = async (megaTestId: string): Promise<number> => {
  try {
    const participantsRef = collection(db, 'mega-tests', megaTestId, 'participants');
    const snapshot = await getDocs(participantsRef);
    const participants = snapshot.docs.map(doc => doc.data());
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
