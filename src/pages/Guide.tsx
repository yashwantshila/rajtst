import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGuideContent } from '../services/firebase/guide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Guide = () => {
  const navigate = useNavigate();
  const { data: guideContent, isLoading, error } = useQuery({
    queryKey: ['guide-content'],
    queryFn: getGuideContent,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Error loading guide content</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Website Guide</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rules and Regulations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              {guideContent ? (
                <div dangerouslySetInnerHTML={{ __html: guideContent }} />
              ) : (
                <p>No guide content available at the moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Guide; 