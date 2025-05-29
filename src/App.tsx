import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './services/firebase/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Auth from './pages/Auth';
import Home from './pages/Index';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminAuth from './pages/AdminAuth';
import CategoryQuizzes from './pages/CategoryQuizzes';
import Quiz from './pages/Quiz';
import MegaTestManager from './pages/admin/MegaTestManager';
import MegaTest from './pages/MegaTest';
import LeaderboardPage from './pages/LeaderboardPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import AboutUs from './pages/AboutUs';
import Guide from './pages/Guide';
import MegaTestPrizesPage from './pages/MegaTestPrizes';
import QuestionPapers from './pages/QuestionPapers';
import QuestionPaperCategory from './pages/QuestionPaperCategory';
import AdminQuestionPaperCategories from './pages/admin/QuestionPaperCategories';
import AdminQuestionPapers from './pages/admin/QuestionPapers';
import PaidContent from './pages/PaidContent';
import PaidContentManager from './pages/admin/PaidContentManager';
import PurchasedContent from './pages/PurchasedContent';
import { SessionTimer } from './components/SessionTimer';
import { Button } from './components/ui/button';
import { User as UserIcon, Book, LogOut } from 'lucide-react';
import { api } from './api/config';
import ProtectedRoute from './components/ProtectedRoute';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { resetTimeout } = useSessionTimeout(!!user);

  const handleLogout = () => {
    // Implement the logout logic here
  };

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin-auth" element={<AdminAuth />} />
      <Route path="/admin/login" element={<Navigate to="/admin-auth" replace />} />
      <Route path="/category/:categoryId" element={
        <ProtectedRoute>
          <CategoryQuizzes />
        </ProtectedRoute>
      } />
      <Route path="/quiz/:categoryId/:quizId" element={
        <ProtectedRoute>
          <Quiz />
        </ProtectedRoute>
      } />
      <Route path="/admin/mega-tests" element={
        <ProtectedRoute>
          <MegaTestManager />
        </ProtectedRoute>
      } />
      <Route path="/mega-test/:megaTestId" element={
        <ProtectedRoute>
          <MegaTest />
        </ProtectedRoute>
      } />
      <Route path="/mega-test/:megaTestId/prizes" element={
        <ProtectedRoute>
          <MegaTestPrizesPage />
        </ProtectedRoute>
      } />
      <Route path="/leaderboard/:megaTestId" element={
        <ProtectedRoute>
          <LeaderboardPage />
        </ProtectedRoute>
      } />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/guide" element={
        <ProtectedRoute>
          <Guide />
        </ProtectedRoute>
      } />
      {/* Question Paper Routes */}
      <Route path="/question-papers" element={
        <ProtectedRoute>
          <QuestionPapers />
        </ProtectedRoute>
      } />
      <Route path="/question-papers/:categoryId" element={
        <ProtectedRoute>
          <QuestionPaperCategory />
        </ProtectedRoute>
      } />
      <Route path="/admin/question-paper-categories" element={
        <ProtectedRoute>
          <AdminQuestionPaperCategories />
        </ProtectedRoute>
      } />
      <Route path="/admin/question-papers/:categoryId" element={
        <ProtectedRoute>
          <AdminQuestionPapers />
        </ProtectedRoute>
      } />
      {/* Paid Content Routes */}
      <Route path="/paid-content" element={
        <ProtectedRoute>
          <PaidContent />
        </ProtectedRoute>
      } />
      <Route path="/purchased-content" element={
        <ProtectedRoute>
          <PurchasedContent />
        </ProtectedRoute>
      } />
      <Route path="/admin/paid-content" element={
        <ProtectedRoute>
          <PaidContentManager />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  useEffect(() => {
    // Ensure all API calls use HTTPS in production
    if (import.meta.env.PROD) {
      if (window.location.protocol !== 'https:') {
        window.location.href = `https:${window.location.href.substring(window.location.protocol.length)}`;
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="bottom-center" richColors />
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
