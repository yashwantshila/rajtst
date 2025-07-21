import React from 'react';
import { Progress } from '@/components/ui/progress';
import { useMegaTestParticipantCount } from '@/hooks/useMegaTestParticipantCount';

interface Props {
  megaTestId: string;
  maxParticipants: number;
}

const MegaTestParticipantProgress: React.FC<Props> = ({ megaTestId, maxParticipants }) => {
  const count = useMegaTestParticipantCount(megaTestId);

  if (!maxParticipants || maxParticipants <= 0) return null;

  const percentage = Math.min(100, (count / maxParticipants) * 100);
  const spotsLeft = Math.max(0, maxParticipants - count);

  return (
    <div className="space-y-1">
      <Progress value={percentage} className="h-2" />
      <div className="text-xs text-muted-foreground">
        {count} / {maxParticipants} registered{spotsLeft > 0 ? ` – ${spotsLeft} spots left` : ' – Full'}
      </div>
    </div>
  );
};

export default MegaTestParticipantProgress;
