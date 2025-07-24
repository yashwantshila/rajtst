import { useMutation, useQuery } from '@tanstack/react-query';
import { startAutomation, getAutomationStatus } from '@/services/api/automation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AutomationRunner = () => {
  const statusQuery = useQuery({
    queryKey: ['automation-status'],
    queryFn: getAutomationStatus,
    refetchInterval: 5000,
  });

  const startMut = useMutation({
    mutationFn: startAutomation,
    onSuccess: () => {
      toast.success('Automation started');
      statusQuery.refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const status = statusQuery.data?.status || 'idle';
  const output = statusQuery.data?.lastOutput || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>WordPress Automation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Status: <span className="font-semibold">{status}</span></p>
        {output && (
          <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">
            {output}
          </pre>
        )}
        <Button onClick={() => startMut.mutate()} disabled={startMut.isPending || status === 'running'}>
          {startMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Automation
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutomationRunner;
