import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const GUIDE_DOC_ID = 'guide_content';

export const getGuideContent = async (): Promise<string> => {
  try {
    const docRef = doc(db, 'guide', GUIDE_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().content;
    }
    
    return '';
  } catch (error) {
    console.error('Error getting guide content:', error);
    throw error;
  }
};

export const updateGuideContent = async (content: string): Promise<void> => {
  try {
    const docRef = doc(db, 'guide', GUIDE_DOC_ID);
    await setDoc(docRef, { content }, { merge: true });
  } catch (error) {
    console.error('Error updating guide content:', error);
    throw error;
  }
}; 