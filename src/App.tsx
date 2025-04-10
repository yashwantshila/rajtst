import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './services/firebase/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
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

interface AuthContextProps {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
});

const useAuth = () => useContext(AuthContext);

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

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-center" richColors />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/category/:categoryId" element={<CategoryQuizzes />} />
            <Route path="/quiz/:categoryId/:quizId" element={<Quiz />} />
            <Route path="/admin/mega-tests" element={<MegaTestManager />} />
            <Route path="/mega-test/:megaTestId" element={<MegaTest />} />
            <Route path="/leaderboard/:megaTestId" element={<LeaderboardPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/about-us" element={<AboutUs />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
export { useAuth, AuthContext };
