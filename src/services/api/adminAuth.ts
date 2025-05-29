import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase/config';
import { toast } from 'sonner';

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export const loginAdmin = async (email: string, password: string): Promise<AdminUser> => {
  try {
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if the user is an admin in Firestore
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
      await signOut(auth);
      throw new Error('You do not have admin privileges');
    }

    // Update the user's role in the users collection
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'admin'
      });
    } else {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    }

    return {
      uid: user.uid,
      email: user.email || '',
      isAdmin: true
    };
  } catch (error: any) {
    // Handle specific Firebase auth errors without logging to console
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No admin account found with this email');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This admin account has been disabled');
    } else {
      throw new Error('Failed to login as admin');
    }
  }
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
  } catch (error) {
    console.error('Admin logout error:', error);
    throw new Error('Failed to logout');
  }
};

export const getCurrentAdmin = async (): Promise<AdminUser | null> => {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }

    // Check if the user is an admin in Firestore
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email || '',
      isAdmin: true
    };
  } catch (error) {
    console.error('Error getting current admin:', error);
    return null;
  }
};

export const refreshAdminToken = async (): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated admin user');
  }
  
  try {
    const token = await user.getIdToken(true); // Force refresh
    return token;
  } catch (error) {
    console.error('Error refreshing admin token:', error);
    throw new Error('Failed to refresh admin token');
  }
}; 