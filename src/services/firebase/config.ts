import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

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

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
