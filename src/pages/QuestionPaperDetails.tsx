import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { slugify } from '../utils/slugify';
import { getQuestionPaperCategories, getQuestionPapersByCategory } from '../services/api/questionPapers';
import type { QuestionPaper, QuestionPaperCategory } from '../services/api/questionPapers';
import { ArrowLeft, Calendar, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import Seo from '@/components/Seo';

export default function QuestionPaperDetails() {
  const { categorySlug, paperSlug } = useParams<{ categorySlug: string; paperSlug: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [category, setCategory] = useState<QuestionPaperCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!categorySlug || !paperSlug) return;
      try {
        const categories = await getQuestionPaperCategories();
        const currentCategory = categories.find(c => slugify(c.title) === categorySlug);
        if (!currentCategory) {
          setError('Category not found');
          setLoading(false);
          return;
        }
        setCategory(currentCategory);
        const papers = await getQuestionPapersByCategory(currentCategory.id);
        const currentPaper = papers.find(p => slugify(p.title) === paperSlug);
        if (!currentPaper) {
          setError('Paper not found');
        } else {
          setPaper(currentPaper);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load paper');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [categorySlug, paperSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !paper || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error || 'Paper not found'}</p>
        <Button onClick={() => navigate(`/pyqs/${categorySlug}`)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Seo title={paper.title} description={paper.description} canonical={`/pyqs/${categorySlug}/${paperSlug}`} />
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/pyqs/${categorySlug}`)}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{paper.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{category.title}</p>
        </div>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{paper.title}</CardTitle>
          <CardDescription>{paper.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{paper.year}</span>
          </div>
          <Button asChild className="w-full">
            <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

