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
import { LogOut, ShieldAlert, Trophy, Clock, ListChecks, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MegaTestLeaderboard from "../components/MegaTestLeaderboard";
import MegaTestPrizes from "../components/MegaTestPrizes";

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

  if (isLoadingCategories || isLoadingMegaTests || isLoadingRegistrations || isLoadingSubmissions) {
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
            <nav className="flex items-center space-x-2 lg:space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-sm font-medium hover:underline">
                    Profile
                  </Link>
                  {(isAdmin || isCustomAdmin) && (
                    <Link to="/admin" className="text-sm font-medium hover:underline flex items-center">
                      <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />
                      Admin
                    </Link>
                  )}
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
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to RajTest!</h1>
          <p className="text-muted-foreground">
            Explore a variety of quizzes and test your knowledge.
          </p>
        </div>

        {isAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-amber-500" />
                Mega Tests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {megaTests && megaTests.length > 0 ? (
                  megaTests.map((megaTest) => {
                    const status = getMegaTestStatus(megaTest);
                    const isRegistered = registrationStatus?.[megaTest.id];

                    return (
                      <Card key={megaTest.id} className="relative overflow-hidden">
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
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Quiz Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizCategories && quizCategories.length > 0 ? (
                  quizCategories.map((category, index) => (
                    <Card key={category.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle>{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full" 
                          variant="outline"
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
          <div className="flex items-center justify-center space-x-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} RajTest. All rights reserved.
            </p>
            <span className="text-sm">•</span>
            <Link to="/privacy-policy" className="text-sm hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="text-sm">•</span>
            <Link to="/terms-and-conditions" className="text-sm hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-sm">•</span>
            <Link to="/about-us" className="text-sm hover:text-foreground transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
