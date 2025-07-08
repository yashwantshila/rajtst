import { useState, useEffect } from 'react'; // Added useEffect for potential future use, not strictly needed now
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
  Quiz, // This type now has questions?: QuizQuestion[]
  QuizQuestion,
  SubCategory,
  createQuizCategory,
  updateQuizCategory,
  deleteQuizCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizQuestions // Added import
} from '@/services/firebase/quiz';
import { getQuizCategories, getSubCategories, getQuizzesByCategory } from '@/services/api/quiz';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { v4 as uuidv4 } from 'uuid';

interface CategoryFormData {
  title: string;
  description: string;
}

interface QuizFormData {
  title: string;
  description: string;
  questions: QuizQuestion[]; // This remains the same for the form
}

interface BatchProgress {
  total: number;
  current: number;
  status: string;
}

const SAMPLE_FORMAT = `# Simple Question
What is the capital of France?
|Paris|London|Berlin|Madrid|a

# Multi-line Question
Which of the following is correct about React?
It is a JavaScript library for building user interfaces.
|True, React is a JS library|False, React is a programming language|False, React is only for mobile apps|False, React is a database|a

# Assertion and Reasoning
Assertion: The Earth is flat.
Reason: The horizon appears flat when we look at it.
Choose the correct option:
|Both Assertion and Reason are true and Reason is the correct explanation of Assertion|Both Assertion and Reason are true but Reason is not the correct explanation of Assertion|Assertion is true but Reason is false|Both Assertion and Reason are false|d

# Matching Type
Match the following:
Column A:
1. Capital of France
2. Capital of Japan
3. Capital of India
Column B:
a. Tokyo
b. New Delhi
c. Paris
Choose the correct matching:
|1-c, 2-a, 3-b|1-a, 2-b, 3-c|1-b, 2-c, 3-a|1-c, 2-b, 3-a|a`;

export const QuizManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateSubCategoryDialogOpen, setIsCreateSubCategoryDialogOpen] = useState(false);
  const [isEditSubCategoryDialogOpen, setIsEditSubCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    title: '',
    description: ''
  });
  const [subCategoryFormData, setSubCategoryFormData] = useState<CategoryFormData>({
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
  const [selectedCategoryForSubCategories, setSelectedCategoryForSubCategories] = useState<QuizCategory | null>(null);
  const [selectedSubCategoryForQuizzes, setSelectedSubCategoryForQuizzes] = useState<SubCategory | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<BatchProgress | null>(null);
  const [isLoadingQuizDetails, setIsLoadingQuizDetails] = useState(false); // For loading questions for edit

  const queryClient = useQueryClient();

  const BATCH_SIZE = 50;
  const MAX_QUESTIONS_PER_QUIZ = 500;

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['quiz-categories'],
    queryFn: getQuizCategories
  });

  const { data: subCategories = [], isLoading: isSubCategoriesLoading } = useQuery({
    queryKey: ['sub-categories', selectedCategoryForSubCategories?.id],
    queryFn: () => getSubCategories(selectedCategoryForSubCategories!.id),
    enabled: !!selectedCategoryForSubCategories?.id
  });

  const { data: quizzes = [], isLoading: isQuizzesLoading } = useQuery({
    queryKey: ['quizzes', selectedSubCategoryForQuizzes?.categoryId, selectedSubCategoryForQuizzes?.id],
    queryFn: () => getQuizzesByCategory(selectedSubCategoryForQuizzes!.categoryId, selectedSubCategoryForQuizzes!.id),
    enabled: !!selectedSubCategoryForQuizzes?.id
  });

  // Add a new query to get question counts for all quizzes
  const { data: quizQuestionCounts = {} } = useQuery({
    queryKey: ['quiz-question-counts', quizzes.map(q => q.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        quizzes.map(async (quiz) => {
          const questions = await getQuizQuestions(quiz.id);
          counts[quiz.id] = questions.length;
        })
      );
      return counts;
    },
    enabled: quizzes.length > 0
  });

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

  const createSubCategoryMutation = useMutation({
    mutationFn: (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt'>) => 
      createSubCategory({ ...data, categoryId: selectedCategoryForSubCategories!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-categories', selectedCategoryForSubCategories?.id] });
      toast.success('Sub category created successfully');
      setIsCreateSubCategoryDialogOpen(false);
      resetSubCategoryForm();
    },
    onError: (error) => {
      toast.error('Failed to create sub category');
      console.error('Create sub category error:', error);
    }
  });

  const updateSubCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubCategory> }) => 
      updateSubCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-categories', selectedCategoryForSubCategories?.id] });
      toast.success('Sub category updated successfully');
      setIsEditSubCategoryDialogOpen(false);
      setSelectedSubCategory(null);
      resetSubCategoryForm();
    },
    onError: (error) => {
      toast.error('Failed to update sub category');
      console.error('Update sub category error:', error);
    }
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: deleteSubCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-categories', selectedCategoryForSubCategories?.id] });
      toast.success('Sub category deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete sub category');
      console.error('Delete sub category error:', error);
    }
  });

  const createQuizMutation = useMutation({
    mutationFn: (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'sequence'>) => createQuiz(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedSubCategoryForQuizzes?.categoryId, selectedSubCategoryForQuizzes?.id] });
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'sequence'>> }) => updateQuiz(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedSubCategoryForQuizzes?.categoryId, selectedSubCategoryForQuizzes?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['quizzes', selectedSubCategoryForQuizzes?.categoryId, selectedSubCategoryForQuizzes?.id] });
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

  const resetSubCategoryForm = () => {
    setSubCategoryFormData({ title: '', description: '' });
  };

  const resetQuizForm = () => {
    setQuizFormData({ title: '', description: '', questions: [] });
    setBulkImportError(null);
    setImportProgress(null);
    setBulkQuestions('');
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

  const handleCreateSubCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubCategoryMutation.mutate(subCategoryFormData);
  };

  const handleEditSubCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubCategory) return;
    updateSubCategoryMutation.mutate({
      id: selectedSubCategory.id,
      data: subCategoryFormData
    });
  };

  const handleEditSubCategoryClick = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setSubCategoryFormData({
      title: subCategory.title,
      description: subCategory.description
    });
    setIsEditSubCategoryDialogOpen(true);
  };

  const handleDeleteSubCategoryClick = (id: string) => {
    deleteSubCategoryMutation.mutate(id);
  };

  const handleCreateQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubCategoryForQuizzes) return;
    
    createQuizMutation.mutate({
      ...quizFormData,
      categoryId: selectedSubCategoryForQuizzes.categoryId,
      subcategoryId: selectedSubCategoryForQuizzes.id,
      // sequence: 0 // Or manage sequence appropriately if needed
    });
  };

  const handleEditQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    
    updateQuizMutation.mutate({
      id: selectedQuiz.id,
      data: {
        ...quizFormData,
        // sequence: selectedQuiz.sequence // Preserve or update sequence if needed
      }
    });
  };

  const handleEditQuizClick = async (quiz: Quiz) => {
    setIsLoadingQuizDetails(true);
    setSelectedQuiz(quiz);
    try {
      const fetchedQuestions = await getQuizQuestions(quiz.id);
      setQuizFormData({
        title: quiz.title,
        description: quiz.description,
        questions: fetchedQuestions || [] // Ensure questions is an array
      });
      setIsEditQuizDialogOpen(true);
    } catch (error) {
      toast.error("Failed to load quiz questions for editing.");
      console.error("Error fetching quiz questions for edit:", error);
    } finally {
      setIsLoadingQuizDetails(false);
    }
  };

  const handleDeleteQuizClick = (id: string) => {
    deleteQuizMutation.mutate(id);
  };

  const handleAddQuestion = () => {
    setQuizFormData(prev => ({
      ...prev,
      questions: [
        {
          id: uuidv4(), // Temporary client-side ID
          text: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' }
          ],
          correctAnswer: 'a'
        },
        ...prev.questions
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

  const processBatch = async (questionsToAdd: QuizQuestion[], startIdx: number) => {
    const batchQuestions = questionsToAdd.slice(startIdx, startIdx + BATCH_SIZE);
    
    setQuizFormData(prev => ({
      ...prev,
      questions: [...prev.questions, ...batchQuestions]
    }));

    setImportProgress(prev => ({
      total: questionsToAdd.length,
      current: Math.min((startIdx + BATCH_SIZE), questionsToAdd.length),
      status: 'Adding questions to form...'
    }));

    await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause for UI update
  };

  const handleBulkImport = async () => {
    try {
      setBulkImportError(null);
      setImportProgress({ total: 0, current: 0, status: 'Parsing questions...' });
      
      const questionBlocks = bulkQuestions.split('\n\n').filter(block => block.trim());
      const parsedQuestions: QuizQuestion[] = [];
      
      for (let i = 0; i < questionBlocks.length; i++) {
        const block = questionBlocks[i].trim();
        const lines = block.split('\n');
        
        // Find the line with options (starts with |)
        const optionsLineIndex = lines.findIndex(line => line.trim().startsWith('|'));
        if (optionsLineIndex === -1) {
          throw new Error(`Invalid format in question block ${i + 1}. Missing options line (should start with |).`);
        }
        
        // Combine all lines before the options line as the question text
        const questionText = lines.slice(0, optionsLineIndex).join('\n').trim();
        
        // Parse the options line
        const optionsLine = lines[optionsLineIndex].trim();
        const lastPipeIndex = optionsLine.lastIndexOf('|');
        const optionsPart = optionsLine.substring(1, lastPipeIndex); // Remove first | and everything after last |
        const correctAnswerLetter = optionsLine.substring(lastPipeIndex + 1).trim().toLowerCase();
        
        const optionTexts = optionsPart.split('|').map(opt => opt.trim());
        
        if (optionTexts.length !== 4) {
          throw new Error(`Invalid options format in question block ${i + 1}. Expected 4 options. Found ${optionTexts.length}. Line: "${optionsLine}"`);
        }
        
        if (!['a', 'b', 'c', 'd'].includes(correctAnswerLetter)) {
          throw new Error(`Invalid correct answer in question block ${i + 1}. Must be 'a', 'b', 'c', or 'd'. Found '${correctAnswerLetter}'.`);
        }
        
        parsedQuestions.push({
          id: uuidv4(), // Temporary client-side ID
          text: questionText,
          options: [
            { id: 'a', text: optionTexts[0] },
            { id: 'b', text: optionTexts[1] },
            { id: 'c', text: optionTexts[2] },
            { id: 'd', text: optionTexts[3] }
          ],
          correctAnswer: correctAnswerLetter
        });
      }

      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found in the input.');
      }

      const currentQuestionCount = quizFormData.questions.length;
      if (currentQuestionCount + parsedQuestions.length > MAX_QUESTIONS_PER_QUIZ) {
        throw new Error(`Cannot add ${parsedQuestions.length} questions. Adding these would exceed the limit of ${MAX_QUESTIONS_PER_QUIZ} questions per quiz (current: ${currentQuestionCount}).`);
      }

      for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
        await processBatch(parsedQuestions, i);
      }

      setBulkQuestions('');
      setImportProgress(null);
      toast.success(`Successfully parsed and added ${parsedQuestions.length} questions to the form.`);
    } catch (error: any) {
      setBulkImportError(error.message);
      setImportProgress(null);
      console.error('Bulk import error:', error);
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuizFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
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
            <TabsTrigger value="subcategories" disabled={!selectedCategoryForSubCategories}>Subcategories</TabsTrigger>
            <TabsTrigger value="quizzes" disabled={!selectedSubCategoryForQuizzes && subCategories.length > 0}>Quizzes</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="flex justify-end mb-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => { setIsCreateDialogOpen(isOpen); if (!isOpen) resetForm(); }}>
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
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter category title"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
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
                              title="View Subcategories"
                              onClick={() => {
                                setSelectedCategoryForSubCategories(category);
                                setActiveTab('subcategories');
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Category"
                              onClick={() => handleEditCategoryClick(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Category"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{category.title}"? This will also delete all subcategories and quizzes under this category. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteCategoryClick(category.id)}
                                    disabled={deleteCategoryMutation.isPending}
                                  >
                                    {deleteCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

          <TabsContent value="subcategories">
            {selectedCategoryForSubCategories ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategoryForSubCategories(null);
                      setActiveTab('categories');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Categories ({selectedCategoryForSubCategories.title})
                  </Button>
                  <Dialog open={isCreateSubCategoryDialogOpen} onOpenChange={(isOpen) => { setIsCreateSubCategoryDialogOpen(isOpen); if (!isOpen) resetSubCategoryForm(); }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subcategory
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleCreateSubCategorySubmit}>
                        <DialogHeader>
                          <DialogTitle>Create New Subcategory</DialogTitle>
                          <DialogDescription>
                            Add a new subcategory under "{selectedCategoryForSubCategories.title}"
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="subcategory-title">Title</Label>
                            <Input
                              id="subcategory-title"
                              value={subCategoryFormData.title}
                              onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, title: e.target.value })}
                              placeholder="Enter subcategory title"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="subcategory-description">Description</Label>
                            <Textarea
                              id="subcategory-description"
                              value={subCategoryFormData.description}
                              onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, description: e.target.value })}
                              placeholder="Enter subcategory description"
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createSubCategoryMutation.isPending}>
                            {createSubCategoryMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create Subcategory
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {isSubCategoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : subCategories.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No subcategories found. Create one to get started.
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
                        {subCategories.map((subCategory) => (
                          <TableRow key={subCategory.id}>
                            <TableCell className="font-medium">{subCategory.title}</TableCell>
                            <TableCell>{subCategory.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Quizzes"
                                  onClick={() => {
                                    setSelectedSubCategoryForQuizzes(subCategory);
                                    setActiveTab('quizzes');
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit Subcategory"
                                  onClick={() => handleEditSubCategoryClick(subCategory)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Delete Subcategory"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{subCategory.title}"? This will also delete all quizzes under this subcategory. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDeleteSubCategoryClick(subCategory.id)}
                                        disabled={deleteSubCategoryMutation.isPending}
                                      >
                                        {deleteSubCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                Select a category to manage its subcategories.
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes">
            {selectedSubCategoryForQuizzes ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedSubCategoryForQuizzes(null);
                      setActiveTab('subcategories');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Subcategories ({selectedSubCategoryForQuizzes.title})
                  </Button>
                  <Dialog open={isQuizDialogOpen} onOpenChange={(isOpen) => { setIsQuizDialogOpen(isOpen); if (!isOpen) resetQuizForm();}}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Quiz
                      </Button>
                    </DialogTrigger>
                    {/* Create Quiz Dialog Content - Reusing common QuizFormDialog */}
                    <QuizFormDialog
                        isOpen={isQuizDialogOpen}
                        onOpenChange={setIsQuizDialogOpen}
                        onSubmit={handleCreateQuizSubmit}
                        quizFormData={quizFormData}
                        setQuizFormData={setQuizFormData}
                        handleAddQuestion={handleAddQuestion}
                        handleQuestionChange={handleQuestionChange}
                        handleOptionChange={handleOptionChange}
                        handleRemoveQuestion={handleRemoveQuestion}
                        setIsBulkImportOpen={setIsBulkImportOpen}
                        formType="create"
                        isLoading={createQuizMutation.isPending}
                        dialogTitle={`Create New Quiz in "${selectedSubCategoryForQuizzes.title}"`}
                        dialogDescription="Add a new quiz with its questions."
                    />
                  </Dialog>
                </div>

                {isQuizzesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No quizzes found in this subcategory. Create one to get started.
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
                            <TableCell>{quizQuestionCounts[quiz.id] ?? 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit Quiz"
                                  onClick={() => handleEditQuizClick(quiz)}
                                  disabled={isLoadingQuizDetails && selectedQuiz?.id === quiz.id}
                                >
                                  {isLoadingQuizDetails && selectedQuiz?.id === quiz.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Delete Quiz"
                                      className="text-destructive hover:text-destructive"
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
                                        disabled={deleteQuizMutation.isPending}
                                      >
                                        {deleteQuizMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                {subCategories.length > 0 ? "Select a subcategory to manage its quizzes." : "Create a subcategory first, then manage its quizzes."}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); if(!isOpen) { setSelectedCategory(null); resetForm(); }}}>
        <DialogContent>
          <form onSubmit={handleEditCategorySubmit}>
            <DialogHeader>
              <DialogTitle>Edit Category: {selectedCategory?.title}</DialogTitle>
              <DialogDescription>
                Update the quiz category details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter category title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
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

      {/* Edit Quiz Dialog - Reusing common QuizFormDialog */}
      <Dialog open={isEditQuizDialogOpen} onOpenChange={(isOpen) => { setIsEditQuizDialogOpen(isOpen); if (!isOpen) { setSelectedQuiz(null); resetQuizForm(); }}}>
        {selectedQuiz && (
          <QuizFormDialog
            isOpen={isEditQuizDialogOpen}
            onOpenChange={(isOpen) => { setIsEditQuizDialogOpen(isOpen); if (!isOpen) { setSelectedQuiz(null); resetQuizForm(); }}}
            onSubmit={handleEditQuizSubmit}
            quizFormData={quizFormData}
            setQuizFormData={setQuizFormData}
            handleAddQuestion={handleAddQuestion}
            handleQuestionChange={handleQuestionChange}
            handleOptionChange={handleOptionChange}
            handleRemoveQuestion={handleRemoveQuestion}
            setIsBulkImportOpen={setIsBulkImportOpen}
            formType="edit"
            isLoading={updateQuizMutation.isPending || isLoadingQuizDetails}
            dialogTitle={`Edit Quiz: ${selectedQuiz.title}`}
            dialogDescription="Update the quiz details and its questions."
          />
        )}
      </Dialog>

      {/* Bulk Import Dialog (Common for Create/Edit Quiz) */}
      <Dialog open={isBulkImportOpen} onOpenChange={(isOpen) => { setIsBulkImportOpen(isOpen); if(!isOpen) { setBulkImportError(null); /* Don't reset importProgress here */ }}}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Paste your questions in the format below. Each question block should be separated by a blank line. The last line of each block must contain options and the correct answer letter.</p>
              <code className="block mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap overflow-x-auto">
                {SAMPLE_FORMAT}
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum {MAX_QUESTIONS_PER_QUIZ} questions per quiz. Current in form: {quizFormData.questions.length}
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
                <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="bulk-questions">Questions Text</Label>
              <Textarea
                id="bulk-questions"
                placeholder={"Paste questions here...\n\nExample:\nYour question text...\nOption A Text|Option B Text|Option C Text|Option D Text|a"}
                value={bulkQuestions}
                onChange={(e) => setBulkQuestions(e.target.value)}
                className="min-h-[300px] font-mono text-xs"
                disabled={!!importProgress && importProgress.status.startsWith('Adding')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsBulkImportOpen(false);
              setBulkImportError(null);
              setImportProgress(null); // Reset progress on explicit cancel
              setBulkQuestions(''); // Clear textarea on cancel
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={!bulkQuestions.trim() || (!!importProgress && importProgress.status.startsWith('Adding'))}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {importProgress && importProgress.status.startsWith('Adding') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {importProgress && importProgress.status.startsWith('Adding') ? 'Adding...' : 'Parse & Add to Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};


// Helper component for Create/Edit Quiz Form Dialog
interface QuizFormDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    quizFormData: QuizFormData;
    setQuizFormData: React.Dispatch<React.SetStateAction<QuizFormData>>;
    handleAddQuestion: () => void;
    handleQuestionChange: (index: number, field: keyof QuizQuestion, value: any) => void;
    handleOptionChange: (questionIndex: number, optionId: string, value: string) => void;
    handleRemoveQuestion: (questionId: string) => void;
    setIsBulkImportOpen: (isOpen: boolean) => void;
    formType: 'create' | 'edit';
    isLoading: boolean;
    dialogTitle: string;
    dialogDescription: string;
}

const QuizFormDialog: React.FC<QuizFormDialogProps> = ({
    isOpen, onOpenChange, onSubmit, quizFormData, setQuizFormData,
    handleAddQuestion, handleQuestionChange, handleOptionChange, handleRemoveQuestion,
    setIsBulkImportOpen, formType, isLoading, dialogTitle, dialogDescription
}) => {
    return (
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={onSubmit}>
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`${formType}-quiz-title`}>Title</Label>
                        <Input
                            id={`${formType}-quiz-title`}
                            value={quizFormData.title}
                            onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                            placeholder="Enter quiz title"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${formType}-quiz-description`}>Description</Label>
                        <Textarea
                            id={`${formType}-quiz-description`}
                            value={quizFormData.description}
                            onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                            placeholder="Enter quiz description"
                            required
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Questions ({quizFormData.questions.length})</Label>
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
                        {quizFormData.questions.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No questions added yet. Add questions manually or use bulk import.
                            </p>
                        )}
                        <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2"> {/* Scrollable questions area */}
                            {quizFormData.questions.map((question, qIndex) => (
                                <Card key={question.id} className="p-4 bg-muted/50">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-medium">Question {qIndex + 1}</Label>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleRemoveQuestion(question.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={question.text}
                                            onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                            placeholder="Enter question text"
                                            required
                                            className="min-h-[80px] font-normal bg-background"
                                        />
                                        <div className="grid gap-3">
                                            {question.options.map((option) => (
                                                <div key={option.id} className="flex items-start gap-3">
                                                    <div className="min-w-[2rem] h-8 flex items-center justify-center bg-muted rounded-md mt-1 text-sm">
                                                        {option.id.toUpperCase()}
                                                    </div>
                                                    <Textarea
                                                        value={option.text}
                                                        onChange={(e) => handleOptionChange(qIndex, option.id, e.target.value)}
                                                        placeholder={`Option ${option.id.toUpperCase()}`}
                                                        required
                                                        className="flex-1 min-h-[40px] font-normal bg-background text-sm"
                                                        rows={2}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Label className="min-w-fit text-sm">Correct Answer:</Label>
                                            <select
                                                value={question.correctAnswer}
                                                onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                                className="border rounded px-3 py-2 w-24 text-sm bg-background"
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
                <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-2 border-t">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {formType === 'create' ? 'Create Quiz' : 'Update Quiz'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};