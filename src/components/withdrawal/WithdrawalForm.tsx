import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet, RefreshCw } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SanitizedInput } from '@/components/ui/sanitized-input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import {
  createWithdrawalRequest,
  MINIMUM_WITHDRAWAL_AMOUNT,
  WITHDRAWAL_FEE_PERCENTAGE
} from '../../services/api/withdrawal';

interface WithdrawalFormProps {
  userId: string;
  userName?: string | null;
  currentBalance: number;
  refetchBalance: () => void;
  onWithdrawalSuccess: () => void;
}

export function WithdrawalForm({ 
  userId, 
  userName, 
  currentBalance,
  refetchBalance,
  onWithdrawalSuccess
}: WithdrawalFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const amountValue = parseFloat(amount);
  const feeAmount = isNaN(amountValue) ? 0 : amountValue * WITHDRAWAL_FEE_PERCENTAGE;
  const netAmount = isNaN(amountValue) ? 0 : amountValue - feeAmount;
  
  const createWithdrawalMutation = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);

      try {
        return createWithdrawalRequest(
          userId,
          amountValue,
          upiId,
          userName || undefined
        );
      } catch (error: any) {
        console.error('Withdrawal request error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Your withdrawal request has been submitted. Money will be transferred within 48 hours.');
      setAmount('');
      setUpiId('');
      refetchBalance();
      onWithdrawalSuccess();
    },
    onError: (error: any) => {
      console.error('Withdrawal request error:', error);

      const message =
        error?.response?.data?.error || error?.message || 'Failed to submit withdrawal request';

      if (message.toLowerCase().includes('insufficient balance')) {
        toast.error('Insufficient balance for this withdrawal');
      } else if (message.toLowerCase().includes('minimum withdrawal amount')) {
        toast.error(message);
      } else {
        toast.error(`Error: ${message}`);
      }
    }
  });
  
  const handleWithdrawalSubmit = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amountValue < MINIMUM_WITHDRAWAL_AMOUNT) {
      toast.error(`Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL_AMOUNT}`);
      return;
    }
    
    if (amountValue > currentBalance) {
      toast.error('Withdrawal amount exceeds your available balance');
      return;
    }
    
    if (!upiId || !upiId.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g., name@upi)');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await createWithdrawalMutation.mutateAsync();
    } catch (error) {
      // Error already handled in onError callback
      console.error("Error in withdrawal submit:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Withdraw Funds
        </CardTitle>
        <CardDescription>
          Withdraw money to your UPI account (minimum ₹{MINIMUM_WITHDRAWAL_AMOUNT}). A {(WITHDRAWAL_FEE_PERCENTAGE * 100).toFixed(0)}% fee will be deducted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-1">
              Amount (₹)
            </label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount to withdraw (min. ₹${MINIMUM_WITHDRAWAL_AMOUNT})`}
              min={MINIMUM_WITHDRAWAL_AMOUNT}
              max={currentBalance > 0 ? currentBalance.toString() : '0'}
            />
            {amount && !isNaN(amountValue) && (
              <p className="text-xs text-muted-foreground mt-1">
                You will receive ₹{netAmount.toFixed(2)} after fees.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="upiId" className="block text-sm font-medium text-muted-foreground mb-1">
              UPI ID
            </label>
            <SanitizedInput
              id="upiId"
              type="text"
              value={upiId}
              onChange={setUpiId}
              placeholder="name@upi"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Available balance: <span className="font-medium">₹{currentBalance.toFixed(2)}</span>
        </div>
        <Button 
          onClick={handleWithdrawalSubmit} 
          disabled={isProcessing || !amount || !upiId || parseFloat(amount) > currentBalance || parseFloat(amount) < MINIMUM_WITHDRAWAL_AMOUNT || !upiId.includes('@')}
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Withdraw Funds'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
