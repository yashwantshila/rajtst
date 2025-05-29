import { Clock, AlertTriangle } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';

export const AdminSessionTimer = () => {
  const { showWarning, timeLeft } = useAdminSession();

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className={`flex items-center gap-2 ${showWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
      {showWarning ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}; 