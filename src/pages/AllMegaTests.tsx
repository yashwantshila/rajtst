import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ListChecks, CreditCard, Trophy, Loader2 } from 'lucide-react';
import { getMegaTests, isUserRegistered, hasUserSubmittedMegaTest, registerForMegaTest } from '@/services/api/megaTest';
import { parseTimestamp } from '@/utils/parseTimestamp';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../App';
import MegaTestLeaderboard from '../components/MegaTestLeaderboard';
import MegaTestPrizes from '../components/MegaTestPrizes';
import MegaTestParticipantsProgress from '../components/MegaTestParticipantsProgress';
import { useState } from 'react';
import RegistrationCountdown from '../components/RegistrationCountdown';

const AllMegaTests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const { data: megaTests, isLoading } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: getMegaTests,
  });

  const { data: registrationStatus } = useQuery({
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

  const { data: submissionStatus } = useQuery({
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

  const getMegaTestStatus = (megaTest: any) => {
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

  const handleRegister = async (megaTestId: string) => {
    if (!user) {
      toast.error('Please login to register for mega tests');
      return;
    }
    setRegisteringId(megaTestId);
    try {
      await registerForMegaTest(megaTestId, user.uid, user.displayName || '', user.email || '');
      toast.success('Successfully registered for the mega test!');
      await queryClient.invalidateQueries({ queryKey: ['registrations', user.uid] });
      await queryClient.invalidateQueries({ queryKey: ['participant-count', megaTestId] });
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <h1 className="text-3xl font-bold mb-8">All Mega Tests</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {megaTests?.map((megaTest) => {
          const status = getMegaTestStatus(megaTest);
          const isRegistered = registrationStatus?.[megaTest.id];

          return (
            <Card key={megaTest.id} className="shadow-xl border-2 border-pink-200 hover:border-pink-400 bg-gradient-to-br from-white via-pink-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
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
                  {megaTest.maxParticipants > 0 && (
                    <div className="mt-2">
                      <MegaTestParticipantsProgress
                        megaTestId={megaTest.id}
                        maxParticipants={megaTest.maxParticipants}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    {!user ? (
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
      </div>
    </div>
  );
};

export default AllMegaTests; 