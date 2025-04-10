
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

// Get all users from Firestore
export const getAllUsers = async (): Promise<any[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Update a user's role
export const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    // Update the user's role
    await updateDoc(userRef, { role });
    
    return;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};
