import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  QuizCategory, 
  Quiz,
  QuizQuestion,
  getQuizCategories, 
  createQuizCategory, 
  updateQuizCategory, 
  deleteQuizCategory,
  getQuizzesByCategory,
  createQuiz,
  updateQuiz,
  deleteQuiz
} from '@/services/firebase/quiz';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface CategoryFormData {
  title: string;
  description: string;
}

interface QuizFormData {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

interface BatchProgress {
  total: number;
  current: number;
  status: string;
}

const SAMPLE_FORMAT = `What is the capital of France?|Paris|London|Berlin|Madrid|a
Which of the following is correct about React?
It is a JavaScript library for building user interfaces.|True, React is a JS library|False, React is a programming language|False, React is only for mobile apps|False, React is a database|a
What is 2+2?|3|4|5|6|b`;

export const QuizManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    title: '',
    description: ''
  });
  const [quizFormData, setQuizFormData] = useState<QuizFormData>({
    title: '',
    description: '',
    questions: []
  });
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isEditQuizDialogOpen, setIsEditQuizDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('categories');
  const [selectedCategoryForQuizzes, setSelectedCategoryForQuizzes] = useState<QuizCategory | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<BatchProgress | null>(null);

  const queryClient = useQueryClient();

  // Constants for batching
  const BATCH_SIZE = 50; // Process 50 questions at a time
  const MAX_QUESTIONS_PER_QUIZ = 500; // Limit total questions per quiz

  // Fetch quiz categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['quiz-categories'],
    queryFn: getQuizCategories
  });

  // Fetch quizzes for selected category
  const { data: quizzes = [], isLoading: isQuizzesLoading } = useQuery({
    queryKey: ['quizzes', selectedCategoryForQuizzes?.id],
    queryFn: () => getQuizzesByCategory(selectedCategoryForQuizzes?.id!),
    enabled: !!selectedCategoryForQuizzes?.id
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: createQuizCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-categories'] });
      toast.success('Category created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create category');
      console.error('Create category error:', error);
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuizCategory> }) => 
      updateQuizCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-categories'] });
      toast.success('Category updated successfully');
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update category');
      console.error('Update category error:', error);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteQuizCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete category');
      console.error('Delete category error:', error);
    }
  });

  // Quiz mutations
  const createQuizMutation = useMutation({
    mutationFn: (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => createQuiz(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedCategoryForQuizzes?.id] });
      toast.success('Quiz created successfully');
      setIsQuizDialogOpen(false);
      resetQuizForm();
    },
    onError: (error) => {
      toast.error('Failed to create quiz');
      console.error('Create quiz error:', error);
    }
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quiz> }) => updateQuiz(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedCategoryForQuizzes?.id] });
      toast.success('Quiz updated successfully');
      setIsEditQuizDialogOpen(false);
      setSelectedQuiz(null);
      resetQuizForm();
    },
    onError: (error) => {
      toast.error('Failed to update quiz');
      console.error('Update quiz error:', error);
    }
  });

  const deleteQuizMutation = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedCategoryForQuizzes?.id] });
      toast.success('Quiz deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete quiz');
      console.error('Delete quiz error:', error);
    }
  });

  const resetForm = () => {
    setFormData({ title: '', description: '' });
  };

  const resetQuizForm = () => {
    setQuizFormData({ title: '', description: '', questions: [] });
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate(formData);
  };

  const handleEditCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    updateCategoryMutation.mutate({
      id: selectedCategory.id,
      data: formData
    });
  };

  const handleEditCategoryClick = (category: QuizCategory) => {
    setSelectedCategory(category);
    setFormData({
      title: category.title,
      description: category.description
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCategoryClick = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  const handleCreateQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryForQuizzes) return;
    
    createQuizMutation.mutate({
      ...quizFormData,
      categoryId: selectedCategoryForQuizzes.id
    });
  };

  const handleEditQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    
    updateQuizMutation.mutate({
      id: selectedQuiz.id,
      data: quizFormData
    });
  };

  const handleEditQuizClick = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setQuizFormData({
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions
    });
    setIsEditQuizDialogOpen(true);
  };

  const handleDeleteQuizClick = (id: string) => {
    deleteQuizMutation.mutate(id);
  };

  const handleAddQuestion = () => {
    setQuizFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `question-${prev.questions.length + 1}`,
          text: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' }
          ],
          correctAnswer: 'a'
        }
      ]
    }));
  };

  const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: any) => {
    setQuizFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleOptionChange = (questionIndex: number, optionId: string, value: string) => {
    setQuizFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? {
          ...q,
          options: q.options.map(opt => 
            opt.id === optionId ? { ...opt, text: value } : opt
          )
        } : q
      )
    }));
  };

  const processBatch = async (questions: QuizQuestion[], startIdx: number) => {
    const batchQuestions = questions.slice(startIdx, startIdx + BATCH_SIZE);
    
    setQuizFormData(prev => ({
      ...prev,
      questions: [...prev.questions, ...batchQuestions]
    }));

    setImportProgress(prev => ({
      total: questions.length,
      current: Math.min((startIdx + BATCH_SIZE), questions.length),
      status: 'Processing questions...'
    }));

    // Simulate some delay to prevent UI freezing
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const handleBulkImport = async () => {
    try {
      setBulkImportError(null);
      setImportProgress({ total: 0, current: 0, status: 'Parsing questions...' });
      
      // Split by newline and group lines for multi-line questions
      const lines = bulkQuestions.split('\n');
      const questionGroups: string[][] = [];
      let currentGroup: string[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        if (trimmedLine.includes('|')) {
          if (currentGroup.length > 0) {
            currentGroup[0] = currentGroup.join('\n') + '\n' + trimmedLine;
            questionGroups.push([currentGroup[0]]);
            currentGroup = [];
          } else {
            questionGroups.push([trimmedLine]);
          }
        } else {
          currentGroup.push(trimmedLine);
        }
      });

      // Parse all questions first to validate format
      const questions = questionGroups.map((group, index) => {
        const line = group[0];
        const lastPipeIndex = line.lastIndexOf('|');
        const questionPart = line.substring(0, lastPipeIndex);
        const parts = questionPart.split('|');
        const correctAnswer = line.substring(lastPipeIndex + 1).trim().toLowerCase();

        const questionText = parts[0];
        const options = parts.slice(1);

        if (options.length !== 4) {
          throw new Error(`Invalid format in question ${index + 1}. Each question must have exactly 4 options.`);
        }

        if (!['a', 'b', 'c', 'd'].includes(correctAnswer)) {
          throw new Error(`Invalid correct answer in question ${index + 1}. Must be a, b, c, or d`);
        }

        return {
          id: `question-${quizFormData.questions.length + index + 1}`,
          text: questionText.trim(),
          options: [
            { id: 'a', text: options[0].trim() },
            { id: 'b', text: options[1].trim() },
            { id: 'c', text: options[2].trim() },
            { id: 'd', text: options[3].trim() }
          ],
          correctAnswer: correctAnswer
        };
      });

      if (questions.length === 0) {
        throw new Error('No valid questions found in the input');
      }

      // Check total questions limit
      const totalQuestions = quizFormData.questions.length + questions.length;
      if (totalQuestions > MAX_QUESTIONS_PER_QUIZ) {
        throw new Error(`Cannot add ${questions.length} questions. Maximum limit is ${MAX_QUESTIONS_PER_QUIZ} questions per quiz. Current: ${quizFormData.questions.length}`);
      }

      // Process questions in batches
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        await processBatch(questions, i);
      }

      setBulkQuestions('');
      setIsBulkImportOpen(false);
      setImportProgress(null);
      toast.success(`Successfully imported ${questions.length} questions`);
    } catch (error) {
      setBulkImportError(error.message);
      setImportProgress(null);
      console.error('Bulk import error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quiz Management</CardTitle>
            <CardDescription>Manage quiz categories and their quizzes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="flex justify-end mb-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateCategorySubmit}>
                    <DialogHeader>
                      <DialogTitle>Create New Category</DialogTitle>
                      <DialogDescription>
                        Add a new quiz category that will appear on the homepage
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label htmlFor="title">Title</label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter category title"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="description">Description</label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter category description"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createCategoryMutation.isPending}>
                        {createCategoryMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Category
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No categories found. Create one to get started.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.title}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCategoryForQuizzes(category);
                                setActiveTab('quizzes');
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCategoryClick(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{category.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteCategoryClick(category.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes">
            {selectedCategoryForQuizzes ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategoryForQuizzes(null);
                      setActiveTab('categories');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Categories
                  </Button>
                  <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Quiz
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <form onSubmit={handleCreateQuizSubmit}>
                        <DialogHeader>
                          <DialogTitle>Create New Quiz</DialogTitle>
                          <DialogDescription>
                            Add a new quiz to the category "{selectedCategoryForQuizzes.title}"
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <label htmlFor="quiz-title">Title</label>
                            <Input
                              id="quiz-title"
                              value={quizFormData.title}
                              onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                              placeholder="Enter quiz title"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="quiz-description">Description</label>
                            <Textarea
                              id="quiz-description"
                              value={quizFormData.description}
                              onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                              placeholder="Enter quiz description"
                              required
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-lg font-semibold">Questions</label>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Bulk Import
                                </Button>
                                <Button type="button" variant="outline" onClick={handleAddQuestion}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Question
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-6">
                              {quizFormData.questions.map((question, qIndex) => (
                                <Card key={question.id} className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Question {qIndex + 1}</span>
                                    </div>
                                    <Input
                                      value={question.text}
                                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                      placeholder="Enter question text"
                                      required
                                    />
                                    <div className="grid gap-3">
                                      {question.options.map((option) => (
                                        <div key={option.id} className="flex items-center gap-3">
                                          <div className="min-w-[2rem] h-8 flex items-center justify-center bg-muted rounded-full">
                                            {option.id.toUpperCase()}
                                          </div>
                                          <Input
                                            value={option.text}
                                            onChange={(e) => handleOptionChange(qIndex, option.id, e.target.value)}
                                            placeholder={`Option ${option.id.toUpperCase()}`}
                                            required
                                            className="flex-1"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <label className="min-w-fit">Correct Answer:</label>
                                      <select
                                        value={question.correctAnswer}
                                        onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                        className="border rounded px-3 py-2 w-24"
                                      >
                                        {question.options.map((option) => (
                                          <option key={option.id} value={option.id}>
                                            {option.id.toUpperCase()}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="sticky bottom-0 bg-background pt-2">
                          <Button type="submit" disabled={createQuizMutation.isPending}>
                            {createQuizMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create Quiz
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {isQuizzesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No quizzes found in this category. Create one to get started.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Questions</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quizzes.map((quiz) => (
                          <TableRow key={quiz.id}>
                            <TableCell className="font-medium">{quiz.title}</TableCell>
                            <TableCell>{quiz.description}</TableCell>
                            <TableCell>{quiz.questions.length}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditQuizClick(quiz)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{quiz.title}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDeleteQuizClick(quiz.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a category to manage its quizzes
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditCategorySubmit}>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update the quiz category details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-title">Title</label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter category title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-description">Description</label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateCategoryMutation.isPending}>
                {updateCategoryMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Quiz Dialog */}
      <Dialog open={isEditQuizDialogOpen} onOpenChange={setIsEditQuizDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditQuizSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
              <DialogDescription>
                Update the quiz details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-quiz-title">Title</label>
                <Input
                  id="edit-quiz-title"
                  value={quizFormData.title}
                  onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                  placeholder="Enter quiz title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-quiz-description">Description</label>
                <Textarea
                  id="edit-quiz-description"
                  value={quizFormData.description}
                  onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                  placeholder="Enter quiz description"
                  required
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold">Questions</label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button type="button" variant="outline" onClick={handleAddQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                </div>
                <div className="space-y-6">
                  {quizFormData.questions.map((question, qIndex) => (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Question {qIndex + 1}</span>
                        </div>
                        <Input
                          value={question.text}
                          onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                          placeholder="Enter question text"
                          required
                        />
                        <div className="grid gap-3">
                          {question.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-3">
                              <div className="min-w-[2rem] h-8 flex items-center justify-center bg-muted rounded-full">
                                {option.id.toUpperCase()}
                              </div>
                              <Input
                                value={option.text}
                                onChange={(e) => handleOptionChange(qIndex, option.id, e.target.value)}
                                placeholder={`Option ${option.id.toUpperCase()}`}
                                required
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="min-w-fit">Correct Answer:</label>
                          <select
                            value={question.correctAnswer}
                            onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                            className="border rounded px-3 py-2 w-24"
                          >
                            {question.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.id.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-2">
              <Button type="submit" disabled={updateQuizMutation.isPending}>
                {updateQuizMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Quiz
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Paste your questions in the format below. For multi-line questions, write the question text in multiple lines and put the options on the last line:</p>
              <code className="block mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre overflow-x-auto">
                Question text (single line)|Option A|Option B|Option C|Option D|a

Question text line 1
Question text line 2
Question text line 3|Option A|Option B|Option C|Option D|b</code>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum {MAX_QUESTIONS_PER_QUIZ} questions per quiz. Currently using: {quizFormData.questions.length}
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {bulkImportError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {bulkImportError}
                </AlertDescription>
              </Alert>
            )}

            {importProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{importProgress.status}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="bulk-questions">Questions</Label>
              <Textarea
                id="bulk-questions"
                placeholder={SAMPLE_FORMAT}
                value={bulkQuestions}
                onChange={(e) => setBulkQuestions(e.target.value)}
                className="min-h-[300px] font-mono"
                disabled={!!importProgress}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsBulkImportOpen(false);
              setImportProgress(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={!bulkQuestions.trim() || !!importProgress}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {importProgress ? 'Importing...' : 'Import Questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
