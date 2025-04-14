import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Wallet, Trophy, Gift, FileText, ScrollText, Info, Book } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserManagement } from '@/components/admin/UserManagement';
import { QuizManagement } from '@/components/admin/QuizManagement';
import { PrivacyPolicyManager } from '../components/admin/PrivacyPolicyManager';
import { TermsAndConditionsManager } from '../components/admin/TermsAndConditionsManager';
import { AboutUsManager } from '../components/admin/AboutUsManager';
import GuideManager from '../components/admin/GuideManager';
import MegaTestManager from './admin/MegaTestManager';
import PrizeClaimsManager from './admin/PrizeClaimsManager';
import { getAllUsers, getAllBalances } from '@/services/api/admin';

const ADMIN_EMAILS = ['admin@example.com', 'ij@gmail.com', 'test@example.com'];
const HARDCODED_ADMIN_EMAIL = 'ww@gmail.com';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isCustomAdmin, setIsCustomAdmin] = useState(false);
  
  useEffect(() => {
    const isFirebaseAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
    const isHardcodedAdmin = user && user.email === HARDCODED_ADMIN_EMAIL;
    
    let customAdmin = false;
    try {
      const adminAuth = localStorage.getItem('adminAuth');
      if (adminAuth) {
        const parsedAuth = JSON.parse(adminAuth);
        if (parsedAuth && parsedAuth.isAdmin) {
          customAdmin = true;
          setIsCustomAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error parsing admin auth', error);
      localStorage.removeItem('adminAuth');
    }
    
    console.log('Admin page - Firebase admin?', isFirebaseAdmin);
    console.log('Admin page - Hardcoded admin?', isHardcodedAdmin);
    console.log('Admin page - Custom admin?', customAdmin);
    
    if (!isFirebaseAdmin && !isHardcodedAdmin && !customAdmin) {
      console.log('Admin page - Access denied. Redirecting to admin login');
      toast.error('Access denied. Admin privileges required.');
      navigate('/admin-auth');
      return;
    }
    
    console.log('Admin page - Access granted');
    setLoading(false);
  }, [user, navigate]);
  
  const { data: users, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllUsers,
    enabled: (!!user && !!user.email && ADMIN_EMAILS.includes(user.email)) || isCustomAdmin,
  });
  
  const { data: balances = [], error: balancesError } = useQuery({
    queryKey: ['admin-balances'],
    queryFn: getAllBalances,
    enabled: (!!user && !!user.email && ADMIN_EMAILS.includes(user.email)) || isCustomAdmin,
  });
  
  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin-auth');
    toast.success('Logged out of admin panel');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
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
            <TabsTrigger value="prize-claims" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Prize Claims</span>
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
            />
          </TabsContent>
          
          <TabsContent value="quiz">
            <QuizManagement />
          </TabsContent>

          <TabsContent value="mega-test">
            <MegaTestManager />
          </TabsContent>

          <TabsContent value="prize-claims">
            <PrizeClaimsManager />
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

          <TabsContent value="guide">
            <GuideManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
