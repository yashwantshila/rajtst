
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { WithdrawalRequest } from '../../services/api/withdrawal';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';

interface WithdrawalHistoryProps {
  withdrawalRequests?: WithdrawalRequest[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function WithdrawalHistory({ 
  withdrawalRequests,
  isLoading,
  error,
  refetch
}: WithdrawalHistoryProps) {
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Safely handle the withdrawalRequests prop
  const safeWithdrawalRequests = Array.isArray(withdrawalRequests) ? withdrawalRequests : [];

  const handleRetry = () => {
    toast.info('Refreshing withdrawal history...');
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Withdrawal History
        </CardTitle>
        <CardDescription>
          Track the status of your withdrawal requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner className="h-6 w-6 text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-3 text-amber-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="font-medium">Failed to load withdrawal history</p>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
              There was a problem loading your withdrawal history. This could be due to a network issue or permissions problem.
            </p>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              size="sm"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </div>
        ) : safeWithdrawalRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            You haven't made any withdrawal requests yet.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableCaption>Your withdrawal request history</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>UPI ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeWithdrawalRequests.map((request: WithdrawalRequest) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{formatDate(request.requestDate)}</TableCell>
                    <TableCell>₹{(request.netAmount ?? request.amount).toFixed(2)}</TableCell>
                    <TableCell>{request.upiId}</TableCell>
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell>{request.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
