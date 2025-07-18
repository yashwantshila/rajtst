
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserWithdrawalRequests } from '../services/api/withdrawal';
import { WithdrawalForm } from './withdrawal/WithdrawalForm';
import { WithdrawalHistory } from './withdrawal/WithdrawalHistory';
import { toast } from 'sonner';

interface WithdrawalSectionProps {
  userId: string;
  userName?: string | null;
  currentBalance: number;
  refetchBalance: () => void;
}

export default function WithdrawalSection({ 
  userId, 
  userName, 
  currentBalance,
  refetchBalance
}: WithdrawalSectionProps) {
  const queryClient = useQueryClient();
  
  const { 
    data: withdrawalRequests, 
    isLoading: isWithdrawalHistoryLoading,
    error: withdrawalHistoryError,
    refetch: refetchWithdrawalHistory,
    isError
  } = useQuery({
    queryKey: ['withdrawal-requests', userId],
    queryFn: () => {
      console.log(`Fetching withdrawal history for user: ${userId}`);
      if (!userId) {
        console.error('Attempted to fetch withdrawal history with empty userId');
        toast.error('Cannot fetch withdrawal history: User ID is missing');
        return [];
      }
      return getUserWithdrawalRequests(userId);
    },
    retry: 1, // Reduce retry attempts to prevent excessive index errors
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    enabled: !!userId && userId.length > 0,
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Log any errors with withdrawal history fetching
  if (isError && withdrawalHistoryError) {
    console.error('Error fetching withdrawal history:', withdrawalHistoryError);
    // Don't show toast here as the WithdrawalHistory component will handle the UI for errors
  }
  
  const handleWithdrawalSuccess = () => {
    // Use a more targeted approach to invalidate queries
    queryClient.invalidateQueries({ 
      queryKey: ['withdrawal-requests', userId],
      exact: true // Only invalidate this exact query
    });
    refetchWithdrawalHistory();
    // Show feedback to user
    toast.success('Withdrawal request submitted successfully');
  };
  
  return (
    <div className="space-y-6">
      <WithdrawalForm 
        userId={userId}
        userName={userName}
        currentBalance={currentBalance}
        refetchBalance={refetchBalance}
        onWithdrawalSuccess={handleWithdrawalSuccess}
      />
      
      <WithdrawalHistory 
        withdrawalRequests={withdrawalRequests || []}
        isLoading={isWithdrawalHistoryLoading}
        error={withdrawalHistoryError}
        refetch={refetchWithdrawalHistory}
      />
    </div>
  );
}
