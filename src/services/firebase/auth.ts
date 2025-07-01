import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { getClientIP } from '@/utils/ipDetection';

interface User {
  uid: string;
  email: string | null;
  username: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  ipAddress?: string;
  lastSeenIP?: string;
}

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data() as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const registerUser = async (email: string, password: string, username: string) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with username
    await updateProfile(user, { displayName: username });
    
    const ipAddress = await getClientIP();

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      username,
      createdAt: new Date().toISOString(),
      ipAddress: ipAddress,
      lastSeenIP: ipAddress
    });
    
    // Initialize user balance
    await setDoc(doc(db, 'balance', user.uid), {
      amount: 0,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    });
    
    return user;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last seen IP
    const ipAddress = await getClientIP();
    if (user && ipAddress) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastSeenIP: ipAddress
      });
    }

    return userCredential.user;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};
