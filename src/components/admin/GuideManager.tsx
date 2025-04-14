import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGuideContent, updateGuideContent } from '@/services/firebase/guide';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const GuideManager = () => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const { data: guideContent, isLoading } = useQuery({
    queryKey: ['guide-content'],
    queryFn: getGuideContent,
    onSuccess: (data) => {
      if (data) {
        setContent(data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateGuideContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide-content'] });
      toast.success('Guide content updated successfully');
    },
    onError: () => {
      toast.error('Failed to update guide content');
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('Guide content cannot be empty');
      return;
    }
    updateMutation.mutate(content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Guide Content</h2>
        <p className="text-sm text-muted-foreground">
          Update the rules and regulations content that appears on the Guide page.
        </p>
      </div>

      <div className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter guide content here..."
          className="min-h-[300px]"
        />
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};

export default GuideManager; 