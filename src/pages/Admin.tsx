import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Wallet, Trophy, FileText, ScrollText, Info, Book, FileArchive, DollarSign, Flame, Wrench, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserManagement } from '@/components/admin/UserManagement';
import { QuizManagement } from '@/components/admin/QuizManagement';
import { PrivacyPolicyManager } from '../components/admin/PrivacyPolicyManager';
import { TermsAndConditionsManager } from '../components/admin/TermsAndConditionsManager';
import { AboutUsManager } from '../components/admin/AboutUsManager';
import GuideManager from '../components/admin/GuideManager';
import MaintenanceModeManager from '../components/admin/MaintenanceModeManager';
import MegaTestManager from './admin/MegaTestManager';
import QuestionPaperCategories from './admin/QuestionPaperCategories';
import PaidContentManager from './admin/PaidContentManager';
import DailyChallengeManager from './admin/DailyChallengeManager';
import SEOManager from '../components/admin/SEOManager';
import { WithdrawalManagement } from '../components/admin/WithdrawalManagement';
import { getAllUsers, getAllBalances } from '@/services/api/admin';
import { db } from '@/services/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from '@/components/ui/loading-spinner';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      toast.error('Access denied. Please login first.');
      navigate('/admin-auth');
      return;
    }

    // Check if user is admin in Firestore
    const checkAdminStatus = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
          toast.error('Access denied. Admin privileges required.');
          navigate('/admin-auth');
          return;
        }

        setLoading(false);
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Error verifying admin status');
        navigate('/admin-auth');
      }
    };

    checkAdminStatus();
  }, [user, navigate]);
  
  const { data: users, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllUsers,
    enabled: !loading && !!user
  });
  
  const { data: balances = [], error: balancesError, refetch: refetchBalances } = useQuery({
    queryKey: ['admin-balances'],
    queryFn: getAllBalances,
    enabled: !loading && !!user
  });
  
  const handleLogout = () => {
    navigate('/admin-auth');
    toast.success('Logged out of admin panel');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <AdminHeader onLogout={handleLogout} />
      
      <main className="container mx-auto p-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="mega-test" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Mega Tests</span>
            </TabsTrigger>
            <TabsTrigger value="daily-challenges" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              <span>Daily Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="question-papers" className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              <span>Question Papers</span>
            </TabsTrigger>
            <TabsTrigger value="paid-content" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Paid Content</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>Withdrawals</span>
            </TabsTrigger>
            <TabsTrigger value="privacy-policy" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Privacy Policy</span>
            </TabsTrigger>
            <TabsTrigger value="terms-and-conditions" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span>Terms & Conditions</span>
            </TabsTrigger>
            <TabsTrigger value="about-us" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>About Us</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>SEO</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span>Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              <span>Guide</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <UserManagement 
              users={users} 
              balances={balances}
              isLoading={isUsersLoading}
              usersError={usersError}
              balancesError={balancesError}
              refetchUsers={refetchUsers}
              refetchBalances={refetchBalances}
            />
          </TabsContent>
          
          <TabsContent value="quiz">
            <QuizManagement />
          </TabsContent>

          <TabsContent value="mega-test">
            <MegaTestManager />
          </TabsContent>

          <TabsContent value="daily-challenges">
            <DailyChallengeManager />
          </TabsContent>

          <TabsContent value="question-papers">
            <QuestionPaperCategories />
          </TabsContent>

          <TabsContent value="paid-content">
            <PaidContentManager />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalManagement />
          </TabsContent>

          <TabsContent value="privacy-policy">
            <PrivacyPolicyManager />
          </TabsContent>

          <TabsContent value="terms-and-conditions">
            <TermsAndConditionsManager />
          </TabsContent>

          <TabsContent value="about-us">
            <AboutUsManager />
          </TabsContent>

          <TabsContent value="seo">
            <SEOManager />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceModeManager />
          </TabsContent>

          <TabsContent value="guide">
            <GuideManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
