import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { slugify } from '../utils/slugify';
import { getQuestionPapersByCategory, getQuestionPaperCategories } from '../services/api/questionPapers';
import type { QuestionPaper, QuestionPaperCategory } from '../services/api/questionPapers';
import { ArrowLeft, Download, Calendar, FileText, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function QuestionPaperCategory() {
  const navigate = useNavigate();
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [category, setCategory] = useState<QuestionPaperCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!categorySlug) return;

      try {
        const categoriesData = await getQuestionPaperCategories();
        const currentCategory = categoriesData.find(
          cat => slugify(cat.title) === categorySlug
        );
        if (!currentCategory) {
          setCategory(null);
          setPapers([]);
          return;
        }

        const papersData = await getQuestionPapersByCategory(currentCategory.id);
        setPapers(papersData);
        setCategory(currentCategory);
      } catch (err) {
        setError('Failed to load question papers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categorySlug]);

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

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Category not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/question-papers')}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{category.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{category.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {papers.map((paper) => (
          <Card key={paper.id} className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-xl font-semibold group-hover:text-blue-600 transition-colors line-clamp-2">
                  {paper.title}
                </CardTitle>
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
              </div>
              <CardDescription className="mt-2 text-xs md:text-sm line-clamp-2">
                {paper.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="flex flex-wrap gap-1 md:gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>{paper.year}</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  <span className="hidden sm:inline">Recently Added</span>
                  <span className="sm:hidden">New</span>
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="p-3 md:p-6 pt-0">
              <Button 
                className="w-full group-hover:bg-blue-600 transition-colors text-sm md:text-base"
                asChild
              >
                <a
                  href={paper.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Download
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {papers.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">No question papers available in this category yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
} 