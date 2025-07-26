import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { slugify } from '../utils/slugify';
import { getQuestionPaperCategories } from '../services/api/questionPapers';
import type { QuestionPaperCategory } from '../services/api/questionPapers';
import { ArrowLeft, BookOpen, Download, Users, Clock, Star, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function QuestionPapers() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<QuestionPaperCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getQuestionPaperCategories();
        setCategories(data);
      } catch (err) {
        setError('Failed to load question paper categories');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold"> Previous Year Question Papers</h1>
          <p className="text-muted-foreground mt-1">Access all the previous years papers with a single click</p>
        </div>
      </div>

      

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-xl font-semibold group-hover:text-blue-600 transition-colors line-clamp-2">
                  {category.title}
                </CardTitle>
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
              </div>
              <CardDescription className="mt-2 text-xs md:text-sm line-clamp-2">
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="flex flex-wrap gap-1 md:gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  <span className="hidden sm:inline">Updated Recently</span>
                  <span className="sm:hidden">Recent</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  <span className="hidden sm:inline">1000+ Students</span>
                  <span className="sm:hidden">1000+</span>
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="p-3 md:p-6 pt-0">
              <Button
                className="w-full group-hover:bg-blue-600 transition-colors text-sm md:text-base"
                onClick={() => navigate(`/question-papers/${slugify(category.title)}`)}
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                View Papers
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">No question paper categories available yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
}
