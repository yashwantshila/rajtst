import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from '../firebase/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

interface RegisterResponse extends LoginResponse {}

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify({
      id: user.uid,
      email: user.email,
      username: user.displayName || '',
    }));
    
    return {
      token: await user.getIdToken(),
      user: {
        id: user.uid,
        email: user.email,
        username: user.displayName || '',
      }
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    } else {
      throw new Error('Failed to login: ' + (error.message || 'Unknown error'));
    }
  }
};

export const registerUser = async (email: string, password: string, username: string) => {
  try {
    const auth = getAuth(app);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with username using the imported updateProfile function
    await updateProfile(user, { displayName: username });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      createdAt: new Date().toISOString(),
    });
    
    // Create balance document
    await setDoc(doc(db, 'balance', user.uid), {
      amount: 0,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    });
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify({
      id: user.uid,
      email: user.email,
      username: username,
    }));
    
    return {
      token: await user.getIdToken(),
      user: {
        id: user.uid,
        email: user.email,
        username: username,
      }
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please use a different email or try logging in.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is not valid.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password accounts are not enabled. Please contact support.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak. Please use a stronger password.');
    } else {
      throw new Error('Failed to register: ' + (error.message || 'Unknown error'));
    }
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  const auth = getAuth(app);
  await sendPasswordResetEmail(auth, email);
};

export const logoutUser = async (): Promise<void> => {
  const auth = getAuth(app);
  await signOut(auth);
  localStorage.removeItem('user');
};

export const getCurrentUser = (): { id: string; email: string; username: string } | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  return JSON.parse(userStr);
};

export const getAuthToken = async (): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return await user.getIdToken();
}; 