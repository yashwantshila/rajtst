import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwELq48yZ9BynRGV1yxII0tkQtxWaDJpo",
  authDomain: "raj-test-75qulz.firebaseapp.com",
  projectId: "raj-test-75qulz",
  storageBucket: "raj-test-75qulz.appspot.com",
  messagingSenderId: "1074455492364",
  appId: "1:1074455492364:web:90c6a97fd466f96f627b29"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence and force long polling
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.log('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.log('Persistence not supported by browser');
  }
});
