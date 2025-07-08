import { useQuery } from '@tanstack/react-query';
import { getContent } from '../services/api/content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sanitizeHtml } from '@/utils/sanitize';

const AboutUs = () => {
  const { data: aboutUs, isLoading, error } = useQuery({
    queryKey: ['about-us'],
    queryFn: () => getContent('about-us')
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
        <div className="text-red-500">Error loading About Us content</div>
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
            <CardTitle>About Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_span]:text-foreground [&_div]:text-foreground">
              {aboutUs?.content ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(aboutUs.content) }} />
              ) : (
                <p>About Us content not available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AboutUs; 