import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { initiatePayment } from '../services/razorpay';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CreditCard, UserCircle, AlertTriangle, ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import UserPrizes from '../components/UserPrizes';
import { getUserProfile, UserProfile } from '../services/api/user';

const Profile = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery<UserProfile>({
    queryKey: ['profile', user?.uid],
    queryFn: () => getUserProfile(user?.uid || ''),
    enabled: !!user?.uid,
  });
  
  const handleAddMoney = async () => {
    if (!user) {
      toast.error('You must be logged in to add money');
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('Starting payment process for ₹' + amountValue);
      const result = await initiatePayment(
        user.uid,
        amountValue,
        user.displayName || 'User',
        user.email || ''
      );
      
      if (result.success) {
        toast.success('Payment successful! ₹' + amountValue + ' added to your account.');
        refetchProfile();
        setAmount('');
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Error in payment process:', error);
      toast.error('An error occurred: ' + (error.message || 'Unknown payment error'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-subtle">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>

      <main>
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* User Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span className="font-medium">{profile?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{profile?.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Balance Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Balance
                  </CardTitle>
                  <CardDescription>Your current account balance</CardDescription>
                </CardHeader>
                <CardContent>
                  {isProfileLoading ? (
                    <div className="animate-pulse h-8 bg-muted rounded" />
                  ) : profile?.balance.error ? (
                    <div className="text-center space-y-4">
                      <div className="text-amber-500 flex items-center justify-center gap-2">
                        <ShieldAlert className="h-5 w-5" />
                        <span>Unable to load balance</span>
                      </div>
                      <div className="text-xs text-muted-foreground border-t pt-2 space-y-2">
                        <p>To fix this issue, please ensure that:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>You are properly authenticated</li>
                          <li>The backend service is running</li>
                        </ol>
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => refetchProfile()}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-center py-2">
                      ₹{profile?.balance.amount.toFixed(2) || '0.00'}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Add Money Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Add Money</CardTitle>
                  <CardDescription>Add money to your account using Razorpay</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      className="max-w-[200px]"
                    />
                    <Button 
                      onClick={handleAddMoney} 
                      disabled={isProcessing || profile?.balance.error}
                      className="gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Add Money'
                      )}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {profile?.balance.error ? (
                    <div className="text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Fix database access issues to add money</span>
                    </div>
                  ) : (
                    "Securely processed via Razorpay"
                  )}
                </CardFooter>
              </Card>

              {/* Prizes Won Card */}
              <Card className="md:col-span-2">
                <UserPrizes userId={user.uid} />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
