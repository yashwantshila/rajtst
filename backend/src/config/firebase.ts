import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    try {
      // Get credentials from environment variables
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
      };

      // Validate required fields
      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.error('Missing Firebase credentials:', {
          hasProjectId: !!serviceAccount.projectId,
          hasPrivateKey: !!serviceAccount.privateKey,
          hasClientEmail: !!serviceAccount.clientEmail
        });
        throw new Error('Missing required Firebase credentials in environment variables');
      }

      // Initialize Firebase Admin with service account
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Firebase Admin initialized successfully with project:', serviceAccount.projectId);
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
  
  return {
    db: getFirestore(),
    auth: getAuth()
  };
};

export const { db, auth } = initializeFirebaseAdmin(); 