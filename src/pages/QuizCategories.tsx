import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { getQuizCategories } from '@/services/api/quiz';
import { slugify } from '@/utils/slugify';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QuizCategories = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCategories, setVisibleCategories] = useState(10);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['quiz-categories'],
    queryFn: getQuizCategories
  });

  const filteredCategories = categories.filter(category => 
    category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedCategories = filteredCategories.slice(0, visibleCategories);
  const hasMoreCategories = filteredCategories.length > visibleCategories;

  const handleLoadMore = () => {
    setVisibleCategories(prev => prev + 10);
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
      <h1 className="text-2xl font-bold mb-6">Quiz Categories</h1>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCategories.map((category) => (
          <Card
            key={category.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/category/${slugify(category.title)}/subcategories`)}
          >
            <CardHeader>
              <CardTitle>{category.title}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Sub Categories
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMoreCategories && (
        <div className="mt-6 text-center">
          <Button onClick={handleLoadMore} variant="outline">
            Load More
          </Button>
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No categories found.</p>
        </div>
      )}
    </div>
  );
};

export default QuizCategories; 