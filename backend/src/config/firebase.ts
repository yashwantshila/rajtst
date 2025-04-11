import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    try {
      // Try to load service account from file
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccount.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        // Initialize Firebase Admin with service account
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        
        console.log('Firebase Admin initialized successfully with service account file');
      } else {
        throw new Error('serviceAccount.json file not found. Please ensure it exists in the root directory.');
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  
  return {
    db: getFirestore(),
    auth: getAuth()
  };
};

export const { db, auth } = initializeFirebaseAdmin(); 