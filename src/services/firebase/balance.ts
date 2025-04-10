
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './config';

// Define the balance type to include the optional error property
export interface UserBalance {
  amount: number;
  currency: string;
  lastUpdated: string;
  error?: boolean;
  errorMessage?: string;
}

// Function to check if the balance collection exists in Firestore
export const checkBalanceCollectionExists = async (): Promise<boolean> => {
  try {
    // Try to get at least one document from the balance collection
    const balanceCollectionRef = collection(db, 'balance');
    const q = query(balanceCollectionRef, limit(1));
    const snapshot = await getDocs(q);
    return snapshot.size > 0; // Collection exists and has at least one document
  } catch (error: any) {
    console.error('Error checking balance collection:', error);
    return false; // Either the collection doesn't exist or we don't have permission
  }
};

export const getUserBalance = async (userId: string): Promise<UserBalance> => {
  try {
    console.log(`Getting balance for user ${userId}`);
    const balanceDoc = await getDoc(doc(db, 'balance', userId));
    
    if (balanceDoc.exists()) {
      console.log(`Balance found for user ${userId}`);
      return balanceDoc.data() as UserBalance;
    } else {
      console.log(`No balance found for user ${userId}, creating default balance`);
      // Create balance document if it doesn't exist
      const defaultBalance: UserBalance = {
        amount: 0,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
      };
      
      try {
        await setDoc(doc(db, 'balance', userId), defaultBalance);
        console.log(`Default balance created for user ${userId}`);
        return defaultBalance;
      } catch (error) {
        console.error('Error creating balance document:', error);
        // Return default balance with specific error message
        return {
          amount: 0,
          currency: 'INR',
          lastUpdated: new Date().toISOString(),
          error: true,
          errorMessage: 'Failed to create balance document'
        };
      }
    }
  } catch (error: any) {
    console.error('Error getting user balance:', error);
    
    // Check for specific error codes
    let errorMessage = 'Database error';
    if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied: You need to update Firestore security rules to allow access to the balance collection';
    } else if (error.code === 'resource-exhausted') {
      errorMessage = 'Database quota exceeded';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Database service is temporarily unavailable';
    }
    
    // Return a default balance object with specific error message
    return {
      amount: 0,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
      error: true,
      errorMessage: errorMessage
    };
  }
};

export const updateUserBalance = async (userId: string, amount: number): Promise<number> => {
  try {
    console.log(`Updating balance for user ${userId} by amount ${amount}`);
    const balanceRef = doc(db, 'balance', userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (balanceDoc.exists()) {
      const currentBalance = balanceDoc.data().amount || 0;
      const newBalance = currentBalance + amount;
      
      // Check for insufficient balance if attempting to reduce balance
      if (amount < 0 && newBalance < 0) {
        const error = new Error(`Insufficient balance: current balance ${currentBalance}, attempted withdrawal ${Math.abs(amount)}`);
        error.name = 'InsufficientBalanceError';
        throw error;
      }
      
      console.log(`Current balance: ${currentBalance}, New balance: ${newBalance}`);
      
      await updateDoc(balanceRef, {
        amount: newBalance,
        lastUpdated: new Date().toISOString(),
      });
      console.log(`Balance updated successfully to ${newBalance}`);
      return newBalance;
    } else {
      // Create balance document if it doesn't exist
      console.log(`No balance document exists for user ${userId}, creating new one`);
      
      // If initial transaction is a withdrawal, prevent it
      if (amount < 0) {
        const error = new Error(`Insufficient balance: no balance document exists, attempted withdrawal ${Math.abs(amount)}`);
        error.name = 'InsufficientBalanceError';
        throw error;
      }
      
      const newBalance: UserBalance = {
        amount: amount,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(balanceRef, newBalance);
      console.log(`New balance document created with amount ${amount}`);
      return amount;
    }
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error; // Rethrow the error to be handled by the caller
  }
};
