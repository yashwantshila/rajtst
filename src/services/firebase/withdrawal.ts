
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './config';

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userName?: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'completed' | 'rejected';
  requestDate: string;
  completionDate?: string;
  notes?: string;
}

export const MINIMUM_WITHDRAWAL_AMOUNT = 50;

export const createWithdrawalRequest = async (
  userId: string, 
  amount: number, 
  upiId: string,
  userName?: string
): Promise<string> => {
  try {
    console.log(`Creating withdrawal request for user ${userId} with amount ${amount} to UPI ${upiId}`);
    
    if (amount < MINIMUM_WITHDRAWAL_AMOUNT) {
      throw new Error(`Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL_AMOUNT}`);
    }
    
    const withdrawalRequest: Omit<WithdrawalRequest, 'id'> = {
      userId,
      userName: userName || '',
      amount,
      upiId,
      status: 'pending',
      requestDate: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, 'withdrawals'), withdrawalRequest);
    console.log('Withdrawal request created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    throw error;
  }
};

export const getUserWithdrawalRequests = async (userId: string): Promise<WithdrawalRequest[]> => {
  try {
    if (!userId) {
      console.error('getUserWithdrawalRequests called with empty userId');
      return [];
    }
    
    console.log(`Fetching withdrawal requests for user ${userId}`);
    const withdrawalsRef = collection(db, 'withdrawals');
    
    // Try first with a simple where query without ordering
    // This avoids the need for a composite index
    const q = query(
      withdrawalsRef, 
      where('userId', '==', userId)
    );
    
    console.log(`Executing Firestore query for withdrawals with userId: ${userId}`);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No withdrawal requests found for user ${userId}`);
      return [];
    }
    
    const withdrawals = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Found withdrawal document: ${doc.id} for user ${data.userId}`);
      return {
        id: doc.id,
        ...data
      } as WithdrawalRequest;
    });
    
    // Sort on the client side instead of using orderBy in Firestore
    // This avoids the need for a composite index
    const sortedWithdrawals = withdrawals.sort((a, b) => {
      const dateA = new Date(a.requestDate).getTime();
      const dateB = new Date(b.requestDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    console.log(`Found ${sortedWithdrawals.length} withdrawal requests for user ${userId}`);
    return sortedWithdrawals;
    
  } catch (error) {
    console.error(`Error getting withdrawal requests for user ${userId}:`, error);
    throw error;
  }
};

export const getAllWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  try {
    const withdrawalsRef = collection(db, 'withdrawals');
    
    const snapshot = await getDocs(withdrawalsRef);
    
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WithdrawalRequest));
    
    return withdrawals.sort((a, b) => {
      const dateA = new Date(a.requestDate).getTime();
      const dateB = new Date(b.requestDate).getTime();
      return dateB - dateA; // Descending order
    });
    
  } catch (error) {
    console.error('Error getting all withdrawal requests:', error);
    throw error;
  }
};

export const updateWithdrawalStatus = async (
  withdrawalId: string, 
  status: 'pending' | 'completed' | 'rejected',
  notes?: string
): Promise<void> => {
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    
    const updateData: Partial<WithdrawalRequest> = {
      status,
      notes
    };
    
    if (status === 'completed' || status === 'rejected') {
      updateData.completionDate = new Date().toISOString();
    }
    
    await updateDoc(withdrawalRef, updateData);
    console.log(`Withdrawal ${withdrawalId} status updated to ${status}`);
    
    return;
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    throw error;
  }
};

export const deleteWithdrawalRequest = async (withdrawalId: string): Promise<void> => {
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    await deleteDoc(withdrawalRef);
    console.log(`Withdrawal ${withdrawalId} deleted`);
    return;
  } catch (error) {
    console.error('Error deleting withdrawal request:', error);
    throw error;
  }
};
