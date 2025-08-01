import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { getQuizById } from '@/services/api/quiz';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Quiz = () => {
  const { categoryId, quizId } = useParams();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuizById(quizId!),
    enabled: !!quizId
  });

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

  const handleSubmit = () => {
    if (!quiz) return;

    const totalQuestions = quiz.questions.length;
    let correctAnswers = 0;
    let attemptedQuestions = 0;

    quiz.questions.forEach(question => {
      if (!skippedQuestions.has(question.id)) {
        attemptedQuestions++;
        if (selectedAnswers[question.id] === question.correctAnswer) {
          correctAnswers++;
        }
      }
    });

    setScore(correctAnswers);
    setIsSubmitted(true);

    const skippedCount = skippedQuestions.size;
    const message = skippedCount > 0 
      ? `Quiz completed! Your score: ${correctAnswers} out of ${attemptedQuestions} (${skippedCount} question${skippedCount > 1 ? 's' : ''} skipped)`
      : `Quiz completed! Your score: ${correctAnswers} out of ${attemptedQuestions}`;
    toast.success(message);
  };

  const handleSkipQuestion = () => {
    if (currentQuestion) {
      setSkippedQuestions(prev => new Set([...prev, currentQuestion.id]));
      // Remove any previous answer if it exists
      setSelectedAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[currentQuestion.id];
        return newAnswers;
      });
      handleNextQuestion();
    }
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const isLastQuestion = quiz?.questions && currentQuestionIndex === quiz.questions.length - 1;
  const hasAnsweredCurrent = currentQuestion && selectedAnswers[currentQuestion.id];
  const isCurrentSkipped = currentQuestion && skippedQuestions.has(currentQuestion.id);
  const hasAnsweredAll = quiz?.questions.every(q => selectedAnswers[q.id] || skippedQuestions.has(q.id));
  const totalAnswered = quiz?.questions ? Object.keys(selectedAnswers).length : 0;
  const totalSkipped = skippedQuestions.size;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length ?? 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleBackClick = () => {
    if (isSubmitted) {
      if (quiz?.subcategoryId) {
        navigate(`/category/${quiz.categoryId}/subcategory/${quiz.subcategoryId}/quizzes`);
      } else {
        navigate(`/category/${quiz?.categoryId}/quizzes`);
      }
    } else {
      setShowExitDialog(true);
    }
  };

  const handleExitConfirm = () => {
    handleSubmit();
    if (quiz?.subcategoryId) {
      navigate(`/category/${quiz.categoryId}/subcategory/${quiz.subcategoryId}/quizzes`);
    } else {
      navigate(`/category/${quiz?.categoryId}/quizzes`);
    }
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
      if (quiz?.subcategoryId) {
        navigate(`/category/${quiz.categoryId}/subcategory/${quiz.subcategoryId}/quizzes`);
      } else {
        navigate(`/category/${quiz?.categoryId}/quizzes`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4 hover:bg-background/60"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Category
          </Button>
        </div>

        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Quiz?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to exit the quiz? Your current progress will be submitted automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Continue Quiz</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>
                Yes, Exit Quiz
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !quiz ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>Quiz not found.</p>
              </div>
            </CardContent>
          </Card>
        ) : isSubmitted ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Quiz Results</CardTitle>
              <CardDescription className="text-lg">
                You scored {score} out of {quiz.questions.length} on {quiz.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((question, index) => (
                <Card key={question.id} className="overflow-hidden">
                  <div className="p-4 border-b bg-muted/30">
                    <p className="font-medium">
                      Question {index + 1}: {question.text}
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    {question.options.map(option => {
                      const isSelected = selectedAnswers[question.id] === option.id;
                      const isCorrect = option.id === question.correctAnswer;
                      const wasSkipped = skippedQuestions.has(question.id);
                      let className = "p-3 rounded-lg ";
                      
                      if (wasSkipped) {
                        className += "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 border";
                      } else if (isSelected && isCorrect) {
                        className += "bg-green-100 dark:bg-green-900/30 border-green-500 border";
                      } else if (isSelected && !isCorrect) {
                        className += "bg-red-100 dark:bg-red-900/30 border-red-500 border";
                      } else if (isCorrect) {
                        className += "bg-green-100 dark:bg-green-900/30 border-green-500 border";
                      } else {
                        className += "bg-background";
                      }

                      return (
                        <div key={option.id} className={className}>
                          <div className="flex items-center gap-3">
                            <div className="min-w-[1.5rem] h-6 flex items-center justify-center rounded-full bg-background border text-sm">
                              {option.id.toUpperCase()}
                            </div>
                            <span>{option.text}</span>
                            {wasSkipped ? (
                              <span className="ml-auto text-yellow-600 dark:text-yellow-400 text-sm">
                                Skipped
                              </span>
                            ) : isCorrect && (
                              <span className="ml-auto text-green-600 dark:text-green-400 text-sm">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
              <Button 
                className="w-full mt-6" 
                onClick={() => {
                  if (quiz?.subcategoryId) {
                    navigate(`/category/${quiz.categoryId}/subcategory/${quiz.subcategoryId}/quizzes`);
                  } else {
                    navigate(`/category/${quiz?.categoryId}/quizzes`);
                  }
                }}
              >
                Return to Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="container max-w-3xl mx-auto px-4">
                <div className="flex justify-between items-center py-2">
                  <Button
                    variant="ghost"
                    onClick={handleBackClick}
                    className="hover:bg-background/60 px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      Q{currentQuestionIndex + 1}/{quiz.questions.length}
                    </div>
                    <div className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      {totalAnswered}/{totalSkipped}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <Progress 
                    value={(currentQuestionIndex + 1) / quiz.questions.length * 100} 
                    className="h-1" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-[60px]">
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">Question {currentQuestionIndex + 1}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {currentQuestionIndex + 1} of {quiz.questions.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {currentQuestion && (
                        <>
                          <div className="text-lg whitespace-pre-wrap font-medium">
                            {currentQuestion.text}
                          </div>
                          <div className="space-y-3">
                            {currentQuestion.options.map((option) => (
                              <Button
                                key={option.id}
                                variant={selectedAnswers[currentQuestion.id] === option.id ? "default" : "outline"}
                                className="w-full justify-start h-auto py-4 px-4 text-left"
                                onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="min-w-[1.5rem] h-6 flex items-center justify-center rounded-full bg-muted text-sm mt-1">
                                    {option.id.toUpperCase()}
                                  </div>
                                  <span className="whitespace-pre-wrap text-left">{option.text}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="min-w-[100px]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleSkipQuestion}
                    disabled={isLastQuestion}
                    className="min-w-[100px]"
                  >
                    Skip
                  </Button>

                  {isLastQuestion ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!hasAnsweredCurrent}
                      className="min-w-[100px]"
                    >
                      Submit Quiz
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!hasAnsweredCurrent}
                      className="min-w-[100px]"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Quiz; 