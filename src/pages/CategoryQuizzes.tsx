import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { getQuizzesByCategory, getQuizCategories, getSubCategories } from '@/services/api/quiz';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const CategoryQuizzes = () => {
  const { categoryId, subcategoryId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleQuizzes, setVisibleQuizzes] = useState(10);

  const { data: category } = useQuery({
    queryKey: ['quiz-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const categories = await getQuizCategories();
      return categories.find(cat => cat.id === categoryId);
    },
    enabled: !!categoryId
  });

  const { data: subCategory } = useQuery({
    queryKey: ['sub-category', subcategoryId],
    queryFn: async () => {
      if (!subcategoryId) return null;
      const subCategories = await getSubCategories(categoryId!);
      return subCategories.find(subCat => subCat.id === subcategoryId);
    },
    enabled: !!subcategoryId && !!categoryId
  });

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes', categoryId, subcategoryId],
    queryFn: () => getQuizzesByCategory(categoryId!, subcategoryId),
    enabled: !!categoryId
  });

  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedQuizzes = filteredQuizzes.slice(0, visibleQuizzes);
  const hasMoreQuizzes = filteredQuizzes.length > visibleQuizzes;

  const handleLoadMore = () => {
    setVisibleQuizzes(prev => prev + 10);
  };

  const handleBack = () => {
    if (subcategoryId) {
      navigate(`/category/${categoryId}/subcategories`);
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center">
          <div className="relative group">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold text-2xl tracking-wide uppercase">
              {subcategoryId ? `${category?.title} - ${subCategory?.title}` : category?.title} - Quizzes
            </span>
            <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-full"></div>
          </div>
        </h2>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {displayedQuizzes.map((quiz) => (
          <Card
            key={quiz.id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-400 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800"
            onClick={() => navigate(`/quiz/${quiz.id}`)}
          >
            <CardHeader className="pb-2 space-y-1 sm:space-y-2">
              <CardTitle className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-400 break-words">{quiz.title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">{quiz.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-300 text-sm sm:text-base" 
                variant="default"
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMoreQuizzes && (
        <div className="mt-6 text-center">
          <Button onClick={handleLoadMore} variant="outline">
            Load More
          </Button>
        </div>
      )}

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No quizzes found.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryQuizzes; 