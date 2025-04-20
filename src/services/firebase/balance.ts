import { getUserBalance as getBalanceFromApi, updateUserBalance as updateBalanceFromApi, UserBalance } from '../api/balance';

// Function to check if the balance collection exists in Firestore
export const checkBalanceCollectionExists = async (): Promise<boolean> => {
  try {
    // Using the API to check if a user has a balance by attempting to fetch a dummy user
    // This is a placeholder implementation since we don't need this check when using API
    return true;
  } catch (error: any) {
    console.error('Error checking balance collection:', error);
    return false;
  }
};

export { UserBalance };

export const getUserBalance = async (userId: string): Promise<UserBalance> => {
  return getBalanceFromApi(userId);
};

export const updateUserBalance = async (userId: string, amount: number): Promise<number> => {
  return updateBalanceFromApi(userId, amount);
};
