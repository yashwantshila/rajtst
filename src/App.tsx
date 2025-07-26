import React, { createContext, useState, useEffect, useContext, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './services/firebase/config';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Seo from './components/Seo';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useSingleTabEnforcer } from './hooks/useSingleTabEnforcer';
import { initializeGTM } from './services/gtm';
import LoadingSpinner from './components/ui/loading-spinner';
const Auth = React.lazy(() => import('./pages/Auth'));
const Home = React.lazy(() => import('./pages/Index'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminAuth = React.lazy(() => import('./pages/AdminAuth'));
const CategoryQuizzes = React.lazy(() => import('./pages/CategoryQuizzes'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const MegaTestManager = React.lazy(() => import('./pages/admin/MegaTestManager'));
const MegaTest = React.lazy(() => import('./pages/MegaTest'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = React.lazy(() => import('./pages/TermsAndConditions'));
const AboutUs = React.lazy(() => import('./pages/AboutUs'));
const Guide = React.lazy(() => import('./pages/Guide'));
const MegaTestPrizesPage = React.lazy(() => import('./pages/MegaTestPrizes'));
const QuestionPapers = React.lazy(() => import('./pages/QuestionPapers'));
const QuestionPaperCategory = React.lazy(() => import('./pages/QuestionPaperCategory'));
const AdminQuestionPaperCategories = React.lazy(() => import('./pages/admin/QuestionPaperCategories'));
const AdminQuestionPapers = React.lazy(() => import('./pages/admin/QuestionPapers'));
const PaidContent = React.lazy(() => import('./pages/PaidContent'));
const PaidContentManager = React.lazy(() => import('./pages/admin/PaidContentManager'));
const PurchasedContent = React.lazy(() => import('./pages/PurchasedContent'));
const MaintenancePage = React.lazy(() => import('./pages/Maintenance'));
import { SessionTimer } from './components/SessionTimer';
import { Button } from './components/ui/button';
import { User as UserIcon, Book, LogOut } from 'lucide-react';
import { api } from './api/config';
import ProtectedRoute from './components/ProtectedRoute';
import { getSettings } from './services/api/settings';
const QuizCategories = React.lazy(() => import('./pages/QuizCategories'));
const SubCategories = React.lazy(() => import('./pages/SubCategories'));
const AllMegaTests = React.lazy(() => import('./pages/AllMegaTests'));
const DailyChallenges = React.lazy(() => import('./pages/DailyChallenges'));
const DailyChallengePlay = React.lazy(() => import('./pages/DailyChallengePlay'));
const DailyTopRankers = React.lazy(() => import('./pages/DailyTopRankers'));

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
  useSingleTabEnforcer(!!user);
  const location = useLocation();
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const handleLogout = () => {
    // Implement the logout logic here
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (settings?.maintenanceMode && !location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner className="h-8 w-8 text-primary" /></div>}>
        <MaintenancePage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner className="h-8 w-8 text-primary" /></div>}>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Home />} />
      <Route path="/all-mega-tests" element={<AllMegaTests />} />
      <Route path="/daily-challenges" element={<DailyChallenges />} />
      <Route path="/daily-challenges/:challengeId" element={<DailyChallengePlay />} />
      <Route path="/daily-top-rankers" element={<DailyTopRankers />} />
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
      <Route path="/categories" element={
        <ProtectedRoute>
          <QuizCategories />
        </ProtectedRoute>
      } />
      <Route path="/category/:categorySlug/subcategories" element={
        <ProtectedRoute>
          <SubCategories />
        </ProtectedRoute>
      } />
      <Route path="/category/:categorySlug/subcategory/:subcategorySlug/quizzes" element={
        <ProtectedRoute>
          <CategoryQuizzes />
        </ProtectedRoute>
      } />
      <Route path="/quizzes/:categorySlug" element={
        <ProtectedRoute>
          <CategoryQuizzes />
        </ProtectedRoute>
      } />
      <Route path="/quizzes/:categorySlug/:subcategorySlug" element={
        <ProtectedRoute>
          <CategoryQuizzes />
        </ProtectedRoute>
      } />
      <Route path="/quiz/:quizId" element={
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
      <Route path="/mega-test/:megaTestId/prizes" element={<MegaTestPrizesPage />} />
      <Route path="/leaderboard/:megaTestId" element={<LeaderboardPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/guide" element={
        <ProtectedRoute>
          <Guide />
        </ProtectedRoute>
      } />
      {/* Question Paper Routes */}
      <Route path="/pyqs" element={<QuestionPapers />} />
      <Route path="/pyqs/:categorySlug" element={<QuestionPaperCategory />} />
      <Route path="/admin/question-paper-categories" element={
        <ProtectedRoute>
          <AdminQuestionPaperCategories />
        </ProtectedRoute>
      } />
      <Route path="/admin/pyqs/:categoryId" element={
        <ProtectedRoute>
          <AdminQuestionPapers />
        </ProtectedRoute>
      } />
      {/* Paid Content Routes */}
      <Route path="/paid-content" element={<PaidContent />} />
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
    </Suspense>
  );
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  useEffect(() => {
    // Initialize GTM
    initializeGTM();

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
          <Seo />
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
