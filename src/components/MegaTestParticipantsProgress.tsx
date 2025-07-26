import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { getMegaTestParticipantCount } from '@/services/api/megaTest';

interface MegaTestParticipantsProgressProps {
  megaTestId: string;
  maxParticipants: number;
}

const MegaTestParticipantsProgress = ({ megaTestId, maxParticipants }: MegaTestParticipantsProgressProps) => {
  const { data: count, refetch } = useQuery({
    queryKey: ['participant-count', megaTestId],
    queryFn: () => getMegaTestParticipantCount(megaTestId),
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  if (!maxParticipants || maxParticipants <= 0) return null;

  const percentage = count ? Math.min(100, (count / maxParticipants) * 100) : 0;
  const remaining = maxParticipants - (count ?? 0);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
        <span className="text-muted-foreground">
          {count ?? 0}/{maxParticipants} participants
        </span>
        <span
          className={
            remaining > 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500 dark:text-red-400'
          }
        >
          {remaining > 0 ? `${remaining} seats left` : 'Seats full'}
        </span>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <Progress value={percentage} className="h-2 rounded-full bg-muted" />
    </div>
  );
};

export default MegaTestParticipantsProgress;
