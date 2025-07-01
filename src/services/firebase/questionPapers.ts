import { collection, doc, getDocs, query, setDoc, where, addDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';

export interface QuestionPaperCategory {
  id: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QuestionPaper {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  year: number;
  fileUrl: string;
  fileSize: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get all question paper categories
export const getQuestionPaperCategories = async (): Promise<QuestionPaperCategory[]> => {
  const categoriesRef = collection(db, 'questionPaperCategories');
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as QuestionPaperCategory));
};

// Get question papers by category
export const getQuestionPapersByCategory = async (categoryId: string): Promise<QuestionPaper[]> => {
  const papersRef = collection(db, 'questionPapers');
  const q = query(papersRef, where('categoryId', '==', categoryId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as QuestionPaper))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
};

// Upload question paper
export const uploadQuestionPaper = async (
  categoryId: string,
  title: string,
  description: string,
  year: number,
  file: File
): Promise<QuestionPaper> => {
  // Upload file to Firebase Storage
  const storageRef = ref(storage, `questionPapers/${categoryId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(snapshot.ref);

  // Create document in Firestore
  const paperRef = await addDoc(collection(db, 'questionPapers'), {
    categoryId,
    title,
    description,
    year,
    fileUrl,
    fileSize: file.size,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: paperRef.id,
    categoryId,
    title,
    description,
    year,
    fileUrl,
    fileSize: file.size,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
};

// Delete question paper
export const deleteQuestionPaper = async (paperId: string): Promise<void> => {
  const paperRef = doc(db, 'questionPapers', paperId);
  const paperDoc = await getDoc(paperRef);
  
  if (!paperDoc.exists()) {
    throw new Error('Question paper not found');
  }

  const paperData = paperDoc.data() as QuestionPaper;
  
  // Delete file from Storage
  const storageRef = ref(storage, paperData.fileUrl);
  await deleteObject(storageRef);
  
  // Delete document from Firestore
  await deleteDoc(paperRef);
};

// Admin functions
export const createQuestionPaperCategory = async (
  title: string,
  description: string
): Promise<QuestionPaperCategory> => {
  const categoryRef = await addDoc(collection(db, 'questionPaperCategories'), {
    title,
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: categoryRef.id,
    title,
    description,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
};

export const updateQuestionPaperCategory = async (
  categoryId: string,
  data: Partial<QuestionPaperCategory>
): Promise<void> => {
  const categoryRef = doc(db, 'questionPaperCategories', categoryId);
  await updateDoc(categoryRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteQuestionPaperCategory = async (categoryId: string): Promise<void> => {
  // Delete all papers in the category first
  const papers = await getQuestionPapersByCategory(categoryId);
  await Promise.all(papers.map(paper => deleteQuestionPaper(paper.id)));
  
  // Delete the category
  const categoryRef = doc(db, 'questionPaperCategories', categoryId);
  await deleteDoc(categoryRef);
}; 