import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuizCategories } from '../services/api/quiz';
import { getMegaTests, registerForMegaTest, isUserRegistered, hasUserSubmittedMegaTest, MegaTest } from '../services/api/megaTest';
import { getDailyChallenges, DailyChallenge, startChallenge, getChallengeStatus } from '../services/api/dailyChallenge';
import { parseTimestamp } from '@/utils/parseTimestamp';
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
import { LogOut, ShieldAlert, Trophy, Clock, ListChecks, CreditCard, Book, User, Menu, DollarSign, FileText, Loader2, ArrowUpRight, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MegaTestLeaderboard from "../components/MegaTestLeaderboard";
import { getCookie } from '@/utils/cookies';
import MegaTestPrizes from "../components/MegaTestPrizes";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../components/ui/dropdown-menu";
import { SessionTimer } from '../components/SessionTimer';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { getPaidContents, purchaseContent, downloadContent } from '../services/api/paidContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import RegistrationCountdown from '../components/RegistrationCountdown';
import { captureUserIP } from '../services/api/user';
import { getDeviceId } from '../utils/deviceId';

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
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);
  
  const { user, loading } = useContext(AuthContext);
  const isAuthenticated = user !== null;
  
  const { data: quizCategories, isLoading: isLoadingCategories, error: categoriesError } = useQuery({
    queryKey: ['quiz-categories'],
    queryFn: getQuizCategories,
  });

  const { data: megaTests, isLoading: isLoadingMegaTests, error: megaTestsError } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: getMegaTests,
  });

  const { data: dailyChallenges, isLoading: isLoadingDailyChallenges, error: dailyChallengesError } = useQuery<DailyChallenge[]>({
    queryKey: ['daily-challenges-home'],
    queryFn: getDailyChallenges,
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
    queryFn: getPaidContents,
  });

  const registerMutation = useMutation({
    mutationFn: ({ megaTestId, userId, username, email }: { megaTestId: string; userId: string; username: string; email: string }) =>
      registerForMegaTest(megaTestId, userId, username, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Successfully registered for the mega test!');
    },
    onError: () => {
      toast.error('LOW BALANCE! FAILED TO REGISTER!');
    }
  });

  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [playedChallenges, setPlayedChallenges] = useState<Record<string, boolean>>({});

  const startMutation = useMutation({
    mutationFn: (id: string) => startChallenge(id),
    onSuccess: (_d, id) => {
      toast.success('Challenge started');
      navigate(`/daily-challenges/${id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to start'),
  });

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!user || !dailyChallenges) return;
      const results = await Promise.all(
        dailyChallenges.map(ch =>
          getChallengeStatus(ch.id)
            .then(() => true)
            .catch(() => false),
        ),
      );
      const map: Record<string, boolean> = {};
      dailyChallenges.forEach((ch, idx) => {
        map[ch.id] = results[idx];
      });
      setPlayedChallenges(map);
    };
    fetchStatuses();
  }, [user, dailyChallenges]);

  const handleStartChallenge = async (ch: DailyChallenge) => {
    if (!user) { toast.error('Please login first'); navigate('/auth'); return; }
    const status = await getChallengeStatus(ch.id).catch(() => null);
    if (!status) {
      await startMutation.mutateAsync(ch.id);
      setPlayedChallenges(prev => ({ ...prev, [ch.id]: true }));
    } else {
      navigate(`/daily-challenges/${ch.id}`);
    }
  };

  const handleRegister = async (megaTestId: string) => {
    if (!user) {
      toast.error('Please login to register for mega tests');
      return;
    }
    setRegisteringId(megaTestId);
    try {
      await registerMutation.mutateAsync({ megaTestId, userId: user.uid, username: user.displayName || '', email: user.email || '' });
    } catch (error: any) {
      if (error.message?.includes('Insufficient balance')) {
        toast.error(error.message);
        navigate('/profile');
      } else {
        toast.error('Failed to register for the mega test');
      }
    } finally {
      setRegisteringId(null);
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
      const adminAuth = getCookie('adminAuth');
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
    const registrationStart = parseTimestamp(megaTest.registrationStartTime);
    const registrationEnd = parseTimestamp(megaTest.registrationEndTime);
    const testStart = parseTimestamp(megaTest.testStartTime);
    const testEnd = parseTimestamp(megaTest.testEndTime);
    const resultTime = parseTimestamp(megaTest.resultTime);

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
      navigate('/auth');  // Redirect to auth page
      return;
    }

    try {
      setIsPurchasing(true);
      await purchaseContent(user.uid, content.id);
      toast.success('Purchase successful!');

      try {
        const blob = await downloadContent(content.id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${content.title}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download file:', err);
        toast.error('Unable to download file');
      }
      
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  // IP address state
  const [userIP, setUserIP] = useState<string | null>(null);
  const [isCapturingIP, setIsCapturingIP] = useState(false);
  const [ipCaptureAttempts, setIpCaptureAttempts] = useState(0);
  const [lastCaptureTime, setLastCaptureTime] = useState<number | null>(null);

  // IP capture mutation
  const ipCaptureMutation = useMutation({
    mutationFn: captureUserIP,
    onSuccess: (data) => {
      setUserIP(data.ipAddress);
      setIpCaptureAttempts(0);
      setLastCaptureTime(Date.now());
      // Removed success toast
    },
    onError: (error: any) => {
      console.error('Failed to capture IP address:', error);
      setIpCaptureAttempts(prev => prev + 1);
      
      // Only show error toast for non-authentication errors and after first attempt
      if (!error.message?.includes('Authentication required') && 
          !error.message?.includes('Authentication failed') &&
          ipCaptureAttempts > 0) {
        toast.error('Failed to capture IP address');
      }
    }
  });

  // Helper function to check if user is ready for API calls
  const isUserReadyForAPI = () => {
    return isAuthenticated && user && !isAdmin && !isCustomAdmin && !loading && user.uid;
  };

  // Check if it's time to capture IP (every 3 minutes)
  const shouldCaptureIP = () => {
    if (!lastCaptureTime) return true;
    const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds
    return Date.now() - lastCaptureTime >= threeMinutes;
  };

  // Capture IP address at intervals
  useEffect(() => {
    if (isUserReadyForAPI() && shouldCaptureIP() && ipCaptureAttempts < 3) {
      // Add a small delay to ensure user is fully authenticated
      const timer = setTimeout(() => {
        setIsCapturingIP(true);
        ipCaptureMutation.mutate();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isAdmin, isCustomAdmin, lastCaptureTime, loading, ipCaptureAttempts]);

  // Set up interval for periodic IP capture
  useEffect(() => {
    if (!isUserReadyForAPI()) return;

    const interval = setInterval(() => {
      if (shouldCaptureIP() && !isCapturingIP) {
        setIpCaptureAttempts(0);
        setIsCapturingIP(true);
        ipCaptureMutation.mutate();
      }
    }, 3 * 60 * 1000); // Check every 3 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, user, isAdmin, isCustomAdmin, lastCaptureTime, isCapturingIP]);

  // Reset capturing state when mutation completes
  useEffect(() => {
    if (!ipCaptureMutation.isPending) {
      setIsCapturingIP(false);
    }
  }, [ipCaptureMutation.isPending]);

  if (isLoadingCategories || isLoadingMegaTests || isLoadingRegistrations || isLoadingSubmissions || isLoadingPaidContents || isLoadingDailyChallenges) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (categoriesError || megaTestsError || dailyChallengesError) {
    return <div className="flex items-center justify-center min-h-screen">Error: {categoriesError?.message || megaTestsError?.message || dailyChallengesError?.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4" onMouseMove={resetTimeout} onKeyDown={resetTimeout}>
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

      <main className="container mx-auto px-4 py-3">
        {/* Single-line Compact Note for MegaTest Participants */}
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 flex flex-row items-center justify-between gap-2 text-xs md:text-sm whitespace-nowrap overflow-hidden">
            <span className="text-blue-800 font-medium truncate">
            मेगाटेस्ट में भाग लेने से पहले गाइड पेज पढ़ें।
            </span>
            <Button
              className="h-7 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded ml-2 flex-shrink-0"
              onClick={() => navigate('/guide')}
              variant="default"
              type="button"
            >
              Guide
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-10">
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
                  <Link to="/auth" className="text-yellow-800 font-semibold underline hover:text-yellow-900"> 
                    Register or login 
                  </Link> now to participate in high-stakes <span className="underline">MegaTests</span> held regularly on our platform. Compete with thousands of students and <span className="text-green-700 font-medium">grab exciting rewards</span>! 💸🎁
                </p>
              </div>

            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-1.5xl font-bold flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-amber-500" />
                MegaTests
              </h2>
              <Button
                onClick={() => navigate('/all-mega-tests')}
                className="flex items-center gap-2 px-4 py-1.5 font-bold rounded-full shadow-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-green-400 text-white text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
                aria-label="View All Mega Tests"
              >
                View All Mega Tests
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4">
                {megaTests && megaTests.length > 0 ? (
                  <>
                    {megaTests.slice(0, 4).map((megaTest) => {
                      const status = getMegaTestStatus(megaTest);
                      const isRegistered = registrationStatus?.[megaTest.id];

                      return (
                        <Card 
                          key={megaTest.id} 
                          className="relative overflow-hidden w-[calc(100vw-2rem)] md:w-[calc(50vw-2rem)] lg:w-[calc(50vw-2rem)] flex-none snap-center snap-always mr-4 last:mr-0 shadow-xl border-2 border-pink-200 hover:border-pink-400 bg-gradient-to-br from-white via-pink-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-base font-bold text-pink-700 dark:text-pink-400 mb-1">{megaTest.title}</CardTitle>
                                <CardDescription className="text-sm text-gray-700 dark:text-gray-300 mb-2">{megaTest.description}</CardDescription>
                              </div>
                              <span className={`text-sm font-bold px-1 py-1 rounded-full shadow ${getMegaTestStatusColor(status)} bg-white/80 dark:bg-gray-900/80 border`}> 
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              <div className="flex flex-col gap-1 mb-2">
                                <RegistrationCountdown
                                  registrationStart={parseTimestamp(megaTest.registrationStartTime)}
                                  registrationEnd={parseTimestamp(megaTest.registrationEndTime)}
                                  className="mb-2"
                                />
                                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-green-500" />
                                    <span>Test: {format(parseTimestamp(megaTest.testStartTime), 'MMM d, yyyy h:mm')} - {format(parseTimestamp(megaTest.testEndTime), 'h:mm a')}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-blue-500" />
                                    <span>Results: {format(parseTimestamp(megaTest.resultTime), 'MMM d, yyyy h:mm a')}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <ListChecks className="h-4 w-4 mr-1 text-yellow-500" />
                                    <span>{megaTest.totalQuestions} Questions</span>
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="h-4 w-4 mr-1 text-indigo-500" />
                                    <span>Entry Fee: ₹{megaTest.entryFee}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <MegaTestLeaderboard megaTestId={megaTest.id} />
                              </div>
                              <div className="mt-2">
                                <MegaTestPrizes megaTestId={megaTest.id} />
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                {!isAuthenticated ? (
                                  <Button
                                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-lg shadow-md transition-colors duration-300"
                                    onClick={() => navigate('/auth')}
                                  >
                                    Sign in to Register
                                  </Button>
                                ) : (
                                  <>
                                    {status === 'registration' && !isRegistered && (
                                      <Button
                                        className="w-full bg-gradient-to-r from-pink-500 via-yellow-400 to-green-400 hover:from-pink-600 hover:to-green-500 text-white font-bold py-2 rounded-lg shadow-md transition-all duration-300"
                                        onClick={() => handleRegister(megaTest.id)}
                                        disabled={registeringId === megaTest.id}
                                      >
                                        {registeringId === megaTest.id ? (
                                          <><Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> Registering...</>
                                        ) : (
                                          'Register Now'
                                        )}
                                      </Button>
                                    )}
                                    {status === 'registration' && isRegistered && (
                                      <Button
                                        className="w-full bg-green-100 text-green-700 font-bold py-2 rounded-lg shadow-none border border-green-300 cursor-not-allowed"
                                        variant="secondary"
                                        disabled
                                      >
                                        Registered
                                      </Button>
                                    )}
                                    {status === 'ongoing' && isRegistered && (
                                      <Button
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg shadow-md transition-colors duration-300"
                                        onClick={() => navigate(`/mega-test/${megaTest.id}`)}
                                        disabled={submissionStatus?.[megaTest.id]}
                                      >
                                        {submissionStatus?.[megaTest.id] ? 'Already Submitted' : 'Start Test'}
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {megaTests.length > 4 && (
                      <>
                        <div className="flex items-center justify-center min-w-[200px] snap-center">
                          <Button
                            onClick={() => navigate('/all-mega-tests')}
                            className="flex items-center gap-2 px-4 py-2 font-bold rounded-full shadow-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-green-400 text-white text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
                          >
                            View More MegaTests
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="min-w-8" />
                      </>
                    )}
                  </>
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
            <div className="relative group flex items-center">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold text-2xl tracking-wide uppercase">
                Daily Challenges
              </span>
              <Button variant="outline" size="sm" className="ml-2" onClick={() => navigate('/daily-challenges')}>All</Button>
              <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-full"></div>
            </div>
          </h2>
          <div className="grid gap-4">
            {dailyChallenges && dailyChallenges.length > 0 ? (
              dailyChallenges.slice(0, 3).map(ch => (
                <Card
                  key={ch.id}
                  className="relative overflow-hidden border-2 border-purple-200 hover:border-purple-400 bg-gradient-to-br from-white via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-all duration-300 hover:shadow-xl"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                      {ch.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <p className="flex items-center">
                        <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                        Reward: ₹{ch.reward}
                      </p>
                      <p className="flex items-center">
                        <ListChecks className="h-4 w-4 text-green-500 mr-1" />
                        Required Correct: {ch.requiredCorrect}
                      </p>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                      onClick={() =>
                        !isAuthenticated ? navigate('/auth') : handleStartChallenge(ch)
                      }
                    >
                      {!isAuthenticated
                        ? 'Sign in'
                        : playedChallenges[ch.id]
                        ? 'View Result'
                        : 'Start'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No challenges available.</p>
            )}
            {dailyChallenges && dailyChallenges.length > 3 && (
              <Button
                onClick={() => navigate('/daily-challenges')}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600"
              >
                View All Challenges
              </Button>
            )}
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
                            onClick={() => !isAuthenticated ? navigate('/auth') : setSelectedContent(content)}
                          >
                            {!isAuthenticated ? 'Sign in to View' : 'View Details'}
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
                              onClick={() => !isAuthenticated ? navigate('/auth') : navigate('/paid-content')}
                            >
                              {!isAuthenticated ? 'Sign in to View All' : 'View All Content'}
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
                      <CardTitle className="text-lg font-semibold text-blue-700 dark:text-blue-400 break-words">{category.title}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-300 break-words">{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-300" 
                        variant="default"
                        onClick={() => !isAuthenticated ? navigate('/auth') : navigate(`/category/${category.id}/subcategories`)}
                      >
                        {!isAuthenticated ? 'Sign in to Browse' : 'Browse Quizzes'}
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
            <span className="hidden sm:inline text-sm">•</span>
            <a
              href="/blog/"
              className="text-sm hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Blog
            </a>
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
