import { useQuery } from '@tanstack/react-query';
import { getContent } from '../services/api/content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sanitizeHtml } from '@/utils/sanitize';

const TermsAndConditions = () => {
  const { data: termsAndConditions, isLoading, error } = useQuery({
    queryKey: ['terms-and-conditions'],
    queryFn: () => getContent('terms-and-conditions')
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error loading terms and conditions</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/60 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_span]:text-foreground [&_div]:text-foreground">
              {termsAndConditions?.content ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(termsAndConditions.content) }} />
              ) : (
                <p>Terms and conditions content not available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TermsAndConditions; 