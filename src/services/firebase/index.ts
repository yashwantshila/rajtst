// This file re-exports all Firebase functionality from the new structure
// for backward compatibility
export * from './config';
export * from './auth';
export * from './balance';
export * from './withdrawal';

// Re-export auth functions
export {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logoutUser,
  resetPassword,
  updateUserProfile,
} from './auth';

// Re-export quiz functions
export {
  getQuizCategories,
  createQuizCategory,
  updateQuizCategory,
  deleteQuizCategory,
  getQuizzesByCategory,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizById,
  getQuizQuestions,
  seedQuizData,
} from './quiz';

// Re-export balance functions
export {
  getUserBalance,
  updateUserBalance,
} from './balance';

// Re-export admin functions
export {
  getAdminQuizzes,
  getAdminQuizCategories,
  updateAdminQuizCategory,
  deleteAdminQuizCategory,
  createAdminQuiz,
  updateAdminQuiz,
  deleteAdminQuiz,
} from './admin';

