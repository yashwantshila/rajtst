import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile, onIdTokenChanged } from 'firebase/auth';
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

// Token refresh interval (in milliseconds)
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes

// Function to start token refresh interval
const startTokenRefresh = () => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (user) {
    // Refresh token immediately
    user.getIdToken(true);
    
    // Set up interval to refresh token
    setInterval(async () => {
      try {
        await user.getIdToken(true);
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }, TOKEN_REFRESH_INTERVAL);
  }
};

// Function to stop token refresh interval
export const stopTokenRefresh = () => {
  // Implementation needed
};

// Set up token refresh listener
const auth = getAuth(app);
onIdTokenChanged(auth, (user) => {
  if (user) {
    startTokenRefresh();
  } else {
    stopTokenRefresh();
  }
});

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get fresh token
    const token = await user.getIdToken(true);
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify({
      id: user.uid,
      email: user.email,
      username: user.displayName || '',
    }));
    
    // Start token refresh interval
    startTokenRefresh();
    
    return {
      token,
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

export const logoutUser = async () => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
    localStorage.removeItem('user');
    stopTokenRefresh();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
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
    console.error('No authenticated user found');
    throw new Error('No authenticated user');
  }
  
  try {
    // Force refresh the token to ensure it's valid
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error('Failed to get authentication token');
  }
};

// Some API calls allow unauthenticated access. This helper returns a token if
// the user is logged in, otherwise it resolves to null without throwing.
export const getAuthTokenOptional = async (): Promise<string | null> => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(true);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};
