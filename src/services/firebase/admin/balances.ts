
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

// Get all users' balance data
export const getAllBalances = async (): Promise<any[]> => {
  try {
    const balanceRef = collection(db, 'balance');
    const snapshot = await getDocs(balanceRef);
    
    return snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw error;
  }
};

// Update a user's balance manually (admin function)
export const updateUserBalanceByAdmin = async (
  userId: string, 
  amount: number, 
  operation: 'set' | 'add' | 'subtract'
): Promise<void> => {
  try {
    const balanceRef = doc(db, 'balance', userId);
    
    // Check if balance record exists
    const balanceDoc = await getDoc(balanceRef);
    if (!balanceDoc.exists()) {
      throw new Error('Balance record not found');
    }
    
    const currentBalance = balanceDoc.data().amount || 0;
    let newBalance = currentBalance;
    
    // Calculate new balance based on operation
    switch (operation) {
      case 'set':
        newBalance = amount;
        break;
      case 'add':
        newBalance = currentBalance + amount;
        break;
      case 'subtract':
        newBalance = Math.max(0, currentBalance - amount); // Never go below 0
        break;
    }
    
    // Update the balance
    await updateDoc(balanceRef, { 
      amount: newBalance,
      lastUpdated: new Date().toISOString()
    });
    
    return;
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
};
