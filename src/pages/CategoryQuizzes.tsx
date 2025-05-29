import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { getQuizzesByCategory } from '@/services/firebase/quiz';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const CategoryQuizzes = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes', categoryId],
    queryFn: () => getQuizzesByCategory(categoryId!),
    enabled: !!categoryId
  });

  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>No quizzes available in this category yet.</p>
                <p className="mt-2">Please check back later!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex gap-2 max-w-md">
                <Input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="secondary" className="shrink-0">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            {filteredQuizzes.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <p>No quizzes found matching your search.</p>
                    <p className="mt-2">Try different keywords or clear the search.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">{quiz.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-2">{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full text-sm sm:text-base" 
                        onClick={() => navigate(`/quiz/${categoryId}/${quiz.id}`)}
                      >
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryQuizzes; 