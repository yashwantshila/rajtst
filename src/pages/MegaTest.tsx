import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ChevronRight, ChevronLeft, Clock, CreditCard, Trophy } from 'lucide-react';
import { getMegaTestById, submitMegaTestResult, MegaTestQuestion, hasUserSubmittedMegaTest } from '@/services/firebase/quiz';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '../App';
import MegaTestLeaderboard from '../components/MegaTestLeaderboard';
import { format } from 'date-fns';
import MegaTestPrizes from '../components/MegaTestPrizes';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const MegaTest = () => {
  const { megaTestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Load saved quiz state from localStorage
  useEffect(() => {
    if (megaTestId && user) {
      const savedState = localStorage.getItem(`megaTest_${megaTestId}_${user.uid}`);
      if (savedState) {
        const { currentQuestionIndex: savedIndex, selectedAnswers: savedAnswers, skippedQuestions: savedSkipped, isStarted, startTime: savedStartTime } = JSON.parse(savedState);
        setCurrentQuestionIndex(savedIndex);
        setSelectedAnswers(savedAnswers);
        setSkippedQuestions(new Set(savedSkipped));
        setIsQuizStarted(isStarted);
        setStartTime(savedStartTime);
      }
    }
  }, [megaTestId, user]);

  // Save quiz state to localStorage
  useEffect(() => {
    if (megaTestId && user && isQuizStarted) {
      const stateToSave = {
        currentQuestionIndex,
        selectedAnswers,
        skippedQuestions: Array.from(skippedQuestions),
        isStarted: isQuizStarted,
        startTime
      };
      localStorage.setItem(`megaTest_${megaTestId}_${user.uid}`, JSON.stringify(stateToSave));
    }
  }, [megaTestId, user, currentQuestionIndex, selectedAnswers, skippedQuestions, isQuizStarted, startTime]);

  // Clear saved state when quiz is submitted
  useEffect(() => {
    if (isSubmitted && megaTestId && user) {
      localStorage.removeItem(`megaTest_${megaTestId}_${user.uid}`);
    }
  }, [isSubmitted, megaTestId, user]);

  const { data, isLoading } = useQuery({
    queryKey: ['mega-test', megaTestId],
    queryFn: () => getMegaTestById(megaTestId!),
    enabled: !!megaTestId
  });

  useEffect(() => {
    const checkSubmissionStatus = async () => {
      if (megaTestId && user) {
        const submitted = await hasUserSubmittedMegaTest(megaTestId, user.uid);
        if (submitted) {
          setHasAlreadySubmitted(true);
          toast.error('You have already submitted this mega test');
          navigate('/');
        }
      }
    };
    checkSubmissionStatus();
  }, [megaTestId, user, navigate]);

  console.log('MegaTest data:', data);
  console.log('MegaTest questions:', data?.questions);

  const { megaTest, questions } = data || { megaTest: null, questions: [] };

  // Start timer when quiz starts
  useEffect(() => {
    if (isQuizStarted && megaTest && !timerActive) {
      const timeLimitInSeconds = megaTest.timeLimit * 60;
      if (startTime) {
        // Calculate remaining time based on startTime
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = Math.max(0, timeLimitInSeconds - elapsedSeconds);
        setTimeLeft(remainingTime);
      } else {
        setTimeLeft(timeLimitInSeconds);
      }
      setTimerActive(true);
    }
  }, [isQuizStarted, megaTest, timerActive, startTime]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const handleTimeUp = () => {
    setTimerActive(false);
    toast.error('Time is up! Your quiz will be submitted automatically.');
    handleSubmit();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    // Remove from skipped questions if it was previously skipped
    if (skippedQuestions.has(questionId)) {
      setSkippedQuestions(prev => {
        const newSkipped = new Set(prev);
        newSkipped.delete(questionId);
        return newSkipped;
      });
    }
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSkipQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      // Only add to skipped questions if no answer is selected
      if (!selectedAnswers[currentQuestion.id]) {
        setSkippedQuestions(prev => new Set([...prev, currentQuestion.id]));
      }
      handleNextQuestion();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!megaTest || !user) return;

    let totalScore = 0;
    const totalQuestions = questions.length;

    questions.forEach(question => {
      const selectedAnswer = selectedAnswers[question.id];
      if (selectedAnswer === question.correctAnswer) {
        totalScore++;
      }
    });

    const completionTime = Math.floor((Date.now() - startTime) / 1000); // Convert to seconds

    setScore(totalScore);
    setIsSubmitted(true);

    try {
      await submitMegaTestResult(megaTest.id, user.uid, totalScore, completionTime);
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit quiz. Please try again.');
    }
  };

  const startQuiz = () => {
    if (isQuizStarted) {
      toast.error('You have already started this quiz');
      return;
    }
    setIsQuizStarted(true);
    setStartTime(Date.now());
  };

  const currentQuestion = questions[currentQuestionIndex];
  const totalAnswered = Object.keys(selectedAnswers).length;
  const totalSkipped = skippedQuestions.size;

  const handleBackClick = () => {
    if (isSubmitted || !isQuizStarted) {
      navigate('/');
    } else {
      setShowExitDialog(true);
    }
  };

  const handleExitConfirm = () => {
    handleSubmit();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!megaTest || !questions.length || hasAlreadySubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>{hasAlreadySubmitted ? 'You have already submitted this mega test.' : 'Mega test not found.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If quiz is started, show only the quiz interface
  if (isQuizStarted && !isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="hover:bg-background/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
              {totalAnswered} answered, {totalSkipped} skipped
            </div>
          </div>
        </div>

        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Mega Test?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to exit the mega test? Your current progress will be submitted automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Continue Test</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>
                Yes, Exit Test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Progress
              value={(currentQuestionIndex / questions.length) * 100}
              className="h-2"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl">Question {currentQuestionIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentQuestion && (
                    <>
                      <div className="text-lg font-medium">
                        {currentQuestion.text}
                      </div>
                      <div className="space-y-3">
                        <RadioGroup
                          value={selectedAnswers[currentQuestion.id] || ''}
                          onValueChange={(value) => {
                            if (value !== selectedAnswers[currentQuestion.id]) {
                              handleAnswerSelect(currentQuestion.id, value);
                            }
                          }}
                          className="space-y-3"
                        >
                          {currentQuestion.options.map((option) => (
                            <div
                              key={option.id}
                              onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                              className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                                selectedAnswers[currentQuestion.id] === option.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                              }`}
                            >
                              <RadioGroupItem
                                value={option.id}
                                id={option.id}
                                className="h-5 w-5"
                              />
                              <Label
                                htmlFor={option.id}
                                className="text-base cursor-pointer flex-1"
                              >
                                {option.text}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardContent className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSkipQuestion}
                      className="gap-2"
                    >
                      Skip
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1 || !selectedAnswers[currentQuestion.id]}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {currentQuestionIndex === questions.length - 1 && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleSubmit}
                className="gap-2"
              >
                Submit Test
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If quiz is submitted, show results
  if (isSubmitted) {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{megaTest.title}</CardTitle>
                <CardDescription>{megaTest.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <h3 className="text-2xl font-bold mb-4">Test Completed!</h3>
                  <p className="text-lg mb-6">Your score: {score} points</p>
                  <Button onClick={() => navigate('/')}>Back to Home</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1">
            <MegaTestLeaderboard megaTestId={megaTestId!} />
          </div>
        </div>
      </div>
    );
  }

  // Show mega test details before starting the quiz
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

      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{megaTest.title}</CardTitle>
            <CardDescription>{megaTest.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {format(megaTest.testStartTime.toDate(), 'PPP p')} - {format(megaTest.testEndTime.toDate(), 'PPP p')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Entry Fee: ₹{megaTest.entryFee}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Prizes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MegaTestPrizes megaTestId={megaTest.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>This mega test contains {questions.length} questions.</p>
              <p>You will have {megaTest?.timeLimit || 60} minutes to complete the test.</p>
              <p>You can skip questions and come back to them later.</p>
              <p>Once you submit or time runs out, you cannot change your answers.</p>
            </div>
            <div className="mt-6">
              <Button size="lg" className="w-full" onClick={startQuiz}>
                Start Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MegaTest; 