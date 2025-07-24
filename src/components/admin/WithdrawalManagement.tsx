
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Wallet, 
  Check, 
  X, 
  Trash2, 
  Search,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  getAllWithdrawalRequests, 
  updateWithdrawalStatus,
  deleteWithdrawalRequest,
  WithdrawalRequest
} from '@/services/api/withdrawal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const WithdrawalManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  
  // Fetch all withdrawal requests
  const { 
    data: withdrawalRequests = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: getAllWithdrawalRequests,
  });
  
  // Process withdrawal mutation
  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes
    }: { 
      id: string; 
      status: 'completed' | 'rejected';
      notes?: string;
    }) => {
      await updateWithdrawalStatus(id, status, notes);
    },
    onSuccess: () => {
      toast.success('Withdrawal status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setSelectedRequestId(null);
      setIsProcessing(false);
    },
    onError: (error: any) => {
      console.error('Error updating withdrawal status:', error);
      toast.error(`Error: ${error.message || 'Failed to update withdrawal'}`);
      setIsProcessing(false);
    }
  });
  
  // Delete withdrawal mutation
  const deleteWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteWithdrawalRequest(id);
    },
    onSuccess: () => {
      toast.success('Withdrawal request deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setSelectedRequestId(null);
    },
    onError: (error: any) => {
      console.error('Error deleting withdrawal request:', error);
      toast.error(`Error: ${error.message || 'Failed to delete withdrawal'}`);
    }
  });

  const filteredRequests = withdrawalRequests.filter((request: WithdrawalRequest) => 
    request.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.upiId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const updateNotes = (id: string, notes: string) => {
    setNotesMap(prev => ({
      ...prev,
      [id]: notes
    }));
  };
  
  const handleStatusUpdate = (id: string, status: 'completed' | 'rejected') => {
    setIsProcessing(true);
    updateWithdrawalMutation.mutate({
      id,
      status,
      notes: notesMap[id]
    });
  };
  
  const handleDelete = (id: string) => {
    deleteWithdrawalMutation.mutate(id);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Withdrawal Requests
        </CardTitle>
        <CardDescription>
          Manage and process user withdrawal requests
        </CardDescription>
        <div className="mt-4 relative">
          <Search className="h-4 w-4 absolute top-3 left-3 text-muted-foreground" />
          <Input
            placeholder="Search by user or UPI ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Error loading withdrawal requests: {(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 animate-pulse">
            Loading withdrawal requests...
          </div>
        ) : !filteredRequests.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No withdrawal requests found.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableCaption>User withdrawal requests</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>UPI ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed On</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request: WithdrawalRequest) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{formatDate(request.requestDate)}</TableCell>
                    <TableCell>{request.userName || request.userId}</TableCell>
                    <TableCell>₹{(request.netAmount ?? request.amount).toFixed(2)}</TableCell>
                    <TableCell>{request.upiId}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{request.completionDate ? formatDate(request.completionDate) : '-'}</TableCell>
                    <TableCell>{request.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {request.status === 'pending' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600">
                                  <Check className="h-3 w-3" />
                                  <span className="hidden sm:inline">Complete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark Withdrawal as Completed</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the withdrawal request as complete. Ensure that you have transferred ₹{(request.netAmount ?? request.amount).toFixed(2)} to {request.upiId}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mt-2">
                                  <label htmlFor="notes" className="text-sm font-medium mb-1 block">
                                    Add Notes (optional)
                                  </label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Transaction ID or any other notes"
                                    value={notesMap[request.id || ''] || ''}
                                    onChange={(e) => updateNotes(request.id || '', e.target.value)}
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => request.id && handleStatusUpdate(request.id, 'completed')}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? 'Processing...' : 'Confirm'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600">
                                  <X className="h-3 w-3" />
                                  <span className="hidden sm:inline">Reject</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Withdrawal Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reject the withdrawal request. Please provide a reason for rejection.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mt-2">
                                  <label htmlFor="rejection-notes" className="text-sm font-medium mb-1 block">
                                    Rejection Reason
                                  </label>
                                  <Textarea
                                    id="rejection-notes"
                                    placeholder="Reason for rejection"
                                    value={notesMap[request.id || ''] || ''}
                                    onChange={(e) => updateNotes(request.id || '', e.target.value)}
                                    required
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => request.id && handleStatusUpdate(request.id, 'rejected')}
                                    disabled={isProcessing || !notesMap[request.id || '']}
                                  >
                                    {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        
                        {request.status !== 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600">
                                <Trash2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Withdrawal Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this withdrawal request from the system. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => request.id && handleDelete(request.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
