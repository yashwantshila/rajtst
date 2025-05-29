import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuizCategories, getMegaTests, registerForMegaTest, isUserRegistered, hasUserSubmittedMegaTest, MegaTest } from '../services/firebase/quiz';
import { AuthContext } from '../App';
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "../components/mode-toggle";
import { logoutUser } from '../services/firebase/auth';
import { LogOut, ShieldAlert, Trophy, Clock, ListChecks, CreditCard, Book, User, Menu, DollarSign, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MegaTestLeaderboard from "../components/MegaTestLeaderboard";
import MegaTestPrizes from "../components/MegaTestPrizes";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../components/ui/dropdown-menu";
import { SessionTimer } from '../components/SessionTimer';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getUserBalance, updateUserBalance } from '../services/firebase/balance';

interface PaidContent {
  id: string;
  title: string;
  description: string;
  price: number;
  pdfUrl: string;
  thumbnailUrl?: string;
}

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { user, loading } = useContext(AuthContext);
  const isAuthenticated = user !== null;
  
  const { data: quizCategories, isLoading: isLoadingCategories, error: categoriesError } = useQuery({
    queryKey: ['quiz-categories'],
    queryFn: getQuizCategories,
  });

  const { data: megaTests, isLoading: isLoadingMegaTests, error: megaTestsError } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: getMegaTests
  });

  const { data: registrationStatus, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['registrations', user?.uid],
    queryFn: async () => {
      if (!user || !megaTests) return {};
      const statuses = await Promise.all(
        megaTests.map(async (test) => ({
          megaTestId: test.id,
          isRegistered: await isUserRegistered(test.id, user.uid)
        }))
      );
      return statuses.reduce((acc, status) => ({
        ...acc,
        [status.megaTestId]: status.isRegistered
      }), {});
    },
    enabled: !!user && !!megaTests
  });

  const { data: submissionStatus, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', user?.uid],
    queryFn: async () => {
      if (!user || !megaTests) return {};
      const statuses = await Promise.all(
        megaTests.map(async (test) => ({
          megaTestId: test.id,
          hasSubmitted: await hasUserSubmittedMegaTest(test.id, user.uid)
        }))
      );
      return statuses.reduce((acc, status) => ({
        ...acc,
        [status.megaTestId]: status.hasSubmitted
      }), {});
    },
    enabled: !!user && !!megaTests
  });

  const { data: paidContents, isLoading: isLoadingPaidContents } = useQuery<PaidContent[]>({
    queryKey: ['paid-contents'],
    queryFn: async () => {
      const contentsRef = collection(db, 'paidContents');
      const snapshot = await getDocs(contentsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaidContent[];
    }
  });

  const registerMutation = useMutation({
    mutationFn: ({ megaTestId, userId }: { megaTestId: string; userId: string }) =>
      registerForMegaTest(megaTestId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Successfully registered for the mega test!');
    },
    onError: () => {
      toast.error('LOW BALANCE! FAILED TO REGISTER!');
    }
  });

  const handleRegister = async (megaTestId: string) => {
    if (!user) {
      toast.error('Please login to register for mega tests');
      return;
    }
    try {
      await registerMutation.mutate({ megaTestId, userId: user.uid });
    } catch (error: any) {
      if (error.message?.includes('Insufficient balance')) {
        toast.error(error.message);
        navigate('/profile'); // Redirect to profile page to add money
      } else {
        toast.error('Failed to register for the mega test');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  const isAdmin = user && user.email && 
    (['admin@example.com', 'ij@gmail.com', 'test@example.com', 'ww@gmail.com'].includes(user.email));
  
  const [isCustomAdmin, setIsCustomAdmin] = useState(false);
  
  useEffect(() => {
    try {
      const adminAuth = localStorage.getItem('adminAuth');
      if (adminAuth) {
        const parsedAuth = JSON.parse(adminAuth);
        if (parsedAuth && parsedAuth.isAdmin) {
          setIsCustomAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error parsing admin auth', error);
    }
  }, []);

  const getMegaTestStatus = (megaTest: MegaTest) => {
    const now = new Date();
    const registrationStart = megaTest.registrationStartTime.toDate();
    const registrationEnd = megaTest.registrationEndTime.toDate();
    const testStart = megaTest.testStartTime.toDate();
    const testEnd = megaTest.testEndTime.toDate();
    const resultTime = megaTest.resultTime.toDate();

    if (now < registrationStart) return 'upcoming';
    if (now >= registrationStart && now <= registrationEnd) return 'registration';
    if (now >= testStart && now <= testEnd) return 'ongoing';
    if (now >= resultTime) return 'completed';
    return 'upcoming';
  };

  const getMegaTestStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-500';
      case 'registration': return 'text-green-500';
      case 'ongoing': return 'text-yellow-500';
      case 'completed': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const { resetTimeout } = useSessionTimeout(!!user);

  const [selectedContent, setSelectedContent] = useState<PaidContent | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (content: PaidContent) => {
    if (!user) {
      toast.error('Please login to purchase content');
      return;
    }

    try {
      setIsPurchasing(true);
      // Check if user has already purchased
      const userPurchasesRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userPurchasesRef);
      const userData = userDoc.data();
      
      if (userData?.purchases?.includes(content.id)) {
        // If already purchased, redirect to PDF
        window.open(content.pdfUrl, '_blank');
        return;
      }

      // Check user's balance
      const balance = await getUserBalance(user.uid);
      if (balance.amount < content.price) {
        toast.error(`Insufficient balance. You need ₹${content.price}. Current balance: ₹${balance.amount}`);
        navigate('/profile'); // Redirect to profile page to add money
        return;
      }

      // Deduct the price from user's balance
      try {
        await updateUserBalance(user.uid, -content.price);
      } catch (error: any) {
        if (error.name === 'InsufficientBalanceError') {
          toast.error('Insufficient balance to complete the purchase');
          return;
        }
        throw error;
      }

      // Update user's purchases
      await updateDoc(userPurchasesRef, {
        purchases: arrayUnion(content.id)
      });
      
      toast.success('Purchase successful!');
      
      // Open the PDF after successful purchase
      window.open(content.pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoadingCategories || isLoadingMegaTests || isLoadingRegistrations || isLoadingSubmissions || isLoadingPaidContents) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (categoriesError || megaTestsError) {
    return <div className="flex items-center justify-center min-h-screen">Error: {categoriesError?.message || megaTestsError?.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <Link to="/" className="mr-4 flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "Avatar"} />
              <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <span className="font-bold">RajTest</span>
          </Link>
          <div className="flex items-center space-x-4">
            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-sm font-medium hover:underline flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    Profile
                  </Link>
                  <Link to="/guide" className="text-sm font-medium hover:underline flex items-center">
                    <Book className="h-4 w-4 mr-1" />
                    Guide
                  </Link>
                  <Link to="/question-papers" className="text-sm font-medium hover:underline flex items-center">
                    <Book className="h-4 w-4 mr-1" />
                    PYQs
                  </Link>
                  <Link to="/purchased-content" className="text-sm font-medium hover:underline flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    My Purchased Content
                  </Link>
                  
                  {(isAdmin || isCustomAdmin) && (
                    <Link to="/admin" className="text-sm font-medium hover:underline flex items-center">
                      <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />
                      Admin
                    </Link>
                  )}
                  <SessionTimer isAuthenticated={isAuthenticated} onReset={resetTimeout} />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm font-medium hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/auth" className="text-sm font-medium hover:underline">
                  Sign In
                </Link>
              )}
            </nav>
            
            {/* Mobile navigation */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="bg-muted/50 px-2 py-1 rounded-md border">
                <SessionTimer 
                  isAuthenticated={isAuthenticated} 
                  onReset={resetTimeout} 
                  className="text-xs"
                />
              </div>
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/guide" className="flex items-center">
                        <Book className="h-4 w-4 mr-2" />
                        Guide
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/question-papers" className="flex items-center">
                        <Book className="h-4 w-4 mr-2" />
                        PYQs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/purchased-content" className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        My Purchased Content
                      </Link>
                    </DropdownMenuItem>
                    
                    {(isAdmin || isCustomAdmin) && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center">
                          <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="text-sm font-medium hover:underline">
                  Sign In
                </Link>
              )}
            </div>
            
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isAuthenticated && (
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">🎓 Welcome to RajTest!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Your one-stop destination to test your knowledge and rise above the competition. 🚀
            </p>

            <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-5 max-w-2xl mx-auto shadow-md mb-6">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">
                🏆 MegaTests Are Live – Win Grand Prizes!
              </h2>
              <p className="text-yellow-700">
                <Link to = "/auth" className="text-yellow-800 font-semibold underline hover:text-yellow-900"> 
                Register or login 
                </Link> now to participate in high-stakes <span className="underline">MegaTests</span> held regularly on our platform. Compete with thousands of students and <span className="text-green-700 font-medium">grab exciting rewards</span>! 💸🎁
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-2xl mx-auto shadow mb-6">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                📚 Explore Popular Quiz Categories
              </h2>
              <ul className="text-blue-700 space-y-1">
                <li>✅ UGC NET – Paper I & Subject Wise</li>
                <li>✅ RAS – Prelims & Mains Practice</li>
                <li>✅ SSC – CGL, CHSL, GD & More</li>
                <li>✅ Banking Exams – IBPS, SBI, RBI</li>
                <li>✅ UPSC – CSAT, GS, Optional Subjects</li>
                <li>✅ Rajasthan GK & Current Affairs</li>
                <li>➕ Many more subjects added regularly!</li>
              </ul>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-xl p-5 max-w-2xl mx-auto shadow-sm mb-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                🔐 Why Register?
              </h2>
              <ul className="text-green-700 list-disc list-inside text-left">
                <li>Track your progress and scores in real-time</li>
                <li>Access MegaTests and daily quizzes</li>
                <li>Compete with friends and view leaderboards</li>
                <li>Get personalized suggestions and insights</li>
              </ul>
            </div>

            <p className="mt-6 text-center text-lg font-medium text-pink-700">
              🎉 Join <span className="font-bold">thousands of learners</span> who trust RajTest for daily practice and success! Don't wait — <span className="underline"> 
                <Link to="/auth" className="text-yellow-800 font-semibold underline hover:text-yellow-900">
                  Register now
               </Link>
              </span> and start your journey today! 🚀
            </p>
          </div>
        )}

        {isAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-amber-500" />
                Mega Tests
              </h2>
              <div className="relative">
                <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4">
                  {megaTests && megaTests.length > 0 ? (
                    megaTests.map((megaTest) => {
                      const status = getMegaTestStatus(megaTest);
                      const isRegistered = registrationStatus?.[megaTest.id];

                      return (
                        <Card 
                          key={megaTest.id} 
                          className="relative overflow-hidden w-[calc(100vw-2rem)] md:w-[calc(50vw-2rem)] lg:w-[calc(33vw-2rem)] flex-none snap-center snap-always mr-4 last:mr-0"
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{megaTest.title}</CardTitle>
                                <CardDescription>{megaTest.description}</CardDescription>
                              </div>
                              <span className={`text-sm font-medium ${getMegaTestStatusColor(status)}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>Registration: {format(megaTest.registrationStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.registrationEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>Test: {format(megaTest.testStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.testEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>Results: {format(megaTest.resultTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                                <div className="flex items-center">
                                  <ListChecks className="h-4 w-4 mr-1" />
                                  <span>{megaTest.totalQuestions} Questions</span>
                                </div>
                                <div className="flex items-center">
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  <span>Entry Fee: ₹{megaTest.entryFee}</span>
                                </div>
                              </div>

                              <div className="mt-4">
                                <MegaTestLeaderboard megaTestId={megaTest.id} />
                              </div>

                              <div className="mt-4">
                                <MegaTestPrizes megaTestId={megaTest.id} />
                              </div>

                              <div className="flex justify-end gap-2">
                                {status === 'registration' && !isRegistered && (
                                  <Button
                                    className="w-full"
                                    onClick={() => handleRegister(megaTest.id)}
                                  >
                                    Register Now
                                  </Button>
                                )}
                                {status === 'registration' && isRegistered && (
                                  <Button
                                    className="w-full"
                                    variant="secondary"
                                    disabled
                                  >
                                    Registered
                                  </Button>
                                )}
                                {status === 'ongoing' && isRegistered && (
                                  <Button
                                    className="w-full"
                                    onClick={() => navigate(`/mega-test/${megaTest.id}`)}
                                    disabled={submissionStatus?.[megaTest.id]}
                                  >
                                    {submissionStatus?.[megaTest.id] ? 'Already Submitted' : 'Start Test'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground col-span-2 text-center py-8">
                      No mega tests available at the moment.
                    </p>
                  )}
                </div>
                {/* Scroll indicator for mobile */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-center items-center gap-1 py-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="animate-bounce">←</span>
                    <span>Swipe for more tests</span>
                    <span className="animate-bounce">→</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center justify-center">
                <div className="relative group">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold text-2xl tracking-wide uppercase">
                    Paid Content
                  </span>
                  <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-full"></div>
                </div>
              </h2>
              <div className="relative">
                <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4">
                  {paidContents && paidContents.length > 0 ? (
                    <>
                      {paidContents.slice(0, 2).map((content) => (
                        <Card 
                          key={content.id} 
                          className="relative overflow-hidden w-[calc(100vw-2rem)] md:w-[calc(50vw-2rem)] lg:w-[calc(33vw-2rem)] flex-none snap-center snap-always mr-4 last:mr-0 hover:shadow-lg transition-all duration-300 border-2 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800"
                        >
                          <CardHeader className="pb-2 space-y-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg font-semibold text-indigo-700 dark:text-indigo-400 line-clamp-2">{content.title}</CardTitle>
                              <div className="bg-indigo-600 text-white px-2 py-1 rounded-full text-sm font-medium ml-2">
                                ₹{content.price}
                              </div>
                            </div>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{content.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                <span>PDF Format</span>
                              </div>
                            </div>
                            <Button 
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300" 
                              variant="default"
                              onClick={() => setSelectedContent(content)}
                            >
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                      {paidContents.length > 2 && (
                        <Card 
                          className="relative overflow-hidden w-[calc(100vw-2rem)] md:w-[calc(50vw-2rem)] lg:w-[calc(33vw-2rem)] flex-none snap-center snap-always mr-4 last:mr-0 hover:shadow-lg transition-all duration-300 border-2 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800"
                        >
                          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
                            <div className="text-center space-y-4">
                              <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">
                                More Paid Content Available
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Explore our full collection of premium study materials
                              </p>
                              <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300" 
                                variant="default"
                                onClick={() => navigate('/paid-content')}
                              >
                                View All Content
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground col-span-2 text-center py-8">
                      No paid content available.
                    </p>
                  )}
                </div>
                {/* Scroll indicator for mobile */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-center items-center gap-1 py-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="animate-bounce">←</span>
                    <span>Swipe for more content</span>
                    <span className="animate-bounce">→</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center justify-center">
                <div className="relative group">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold text-2xl tracking-wide uppercase">
                    Premium Quizzes
                  </span>
                  <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-full"></div>
                </div>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizCategories && quizCategories.length > 0 ? (
                  quizCategories.map((category, index) => (
                    <Card 
                      key={category.id} 
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-400 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800"
                    >
                      <CardHeader className="pb-2 space-y-2">
                        <CardTitle className="text-lg font-semibold text-blue-700 dark:text-blue-400">{category.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{category.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-300" 
                          variant="default"
                          onClick={() => navigate(`/category/${category.id}`)}
                        >
                          Browse Quizzes
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-10">
                    <p className="text-muted-foreground">No quiz categories available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <p className="text-sm w-full mb-2 sm:mb-0 sm:w-auto">
              &copy; {new Date().getFullYear()} RajTest. All rights reserved.
            </p>
            <span className="hidden sm:inline text-sm">•</span>
            <Link to="/privacy-policy" className="text-sm hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-sm">•</span>
            <Link to="/terms-and-conditions" className="text-sm hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <span className="hidden sm:inline text-sm">•</span>
            <Link to="/about-us" className="text-sm hover:text-foreground transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </footer>

      {/* Content Details Modal */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedContent?.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedContent?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <FileText className="h-4 w-4 mr-1" />
                <span>PDF Format</span>
              </div>
              <div className="text-lg font-semibold text-indigo-600">
                ₹{selectedContent?.price}
              </div>
            </div>
            {selectedContent?.thumbnailUrl && (
              <img
                src={selectedContent.thumbnailUrl}
                alt={selectedContent.title}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedContent(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => selectedContent && handlePurchase(selectedContent)}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Purchase Now'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
