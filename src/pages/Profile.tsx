import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { getUserBalance, UserBalance, checkBalanceCollectionExists } from '../services/firebase/balance';
import { initiatePayment } from '../services/razorpay';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CreditCard, UserCircle, AlertTriangle, ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import UserPrizes from '../components/UserPrizes';

const Profile = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [collectionExists, setCollectionExists] = useState<boolean | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useQuery<UserBalance>({
    queryKey: ['balance', user?.uid],
    queryFn: () => getUserBalance(user?.uid || ''),
    enabled: !!user?.uid,
  });
  
  // Check if the balance collection exists
  useEffect(() => {
    if (user) {
      checkBalanceCollectionExists()
        .then(exists => setCollectionExists(exists))
        .catch(() => setCollectionExists(false));
    }
  }, [user]);

  // Function to manually create balance collection
  const createBalanceCollection = async () => {
    if (!user) return;
    
    setIsCreatingCollection(true);
    try {
      // Try to create the balance document for the current user
      await setDoc(doc(db, 'balance', user.uid), {
        amount: 0,
        currency: 'INR',
        lastUpdated: new Date().toISOString()
      });
      
      toast.success('Balance collection created successfully');
      refetchBalance();
      setCollectionExists(true);
    } catch (error: any) {
      console.error('Error creating balance collection:', error);
      toast.error('Failed to create balance collection: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCreatingCollection(false);
    }
  };
  
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
        amountValue, // Send amount in rupees, conversion to paise happens in the service
        user.displayName || 'User',
        user.email || ''
      );
      
      if (result.success) {
        toast.success('Payment successful! ₹' + amountValue + ' added to your account.');
        refetchBalance();
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/60 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>
      
      <main className="container mx-auto p-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
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
                      <span className="font-medium">{user.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{user.email}</span>
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
                  {isBalanceLoading ? (
                    <div className="animate-pulse-subtle py-4 text-center">Loading balance...</div>
                  ) : balance?.error ? (
                    <div className="text-center py-2">
                      <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
                        <ShieldAlert className="h-5 w-5" />
                        <span className="font-medium">Database Access Issue</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {balance.errorMessage || 'There was an issue accessing your balance from the database.'}
                      </p>
                      <div className="mt-4 text-xs text-muted-foreground border-t pt-2 space-y-2">
                        <p>To fix this issue, please ensure that:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>
                            Firestore security rules are properly configured with this rule:
                            <div className="font-mono text-xs bg-muted p-2 mt-1 rounded overflow-auto">
                              match /balance/{'{userId}'} {'{'}
                              <br />
                              &nbsp;&nbsp;allow read, write: if request.auth != null && request.auth.uid == userId;
                              <br />
                              {'}'}
                            </div>
                          </li>
                          <li>The balance collection exists in your Firestore database</li>
                        </ol>
                        <div className="flex items-center gap-2 pt-1">
                          <a 
                            href="https://console.firebase.google.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary flex items-center gap-1 hover:underline"
                          >
                            <span>Open Firebase Console</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => refetchBalance()}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="gap-1"
                          onClick={createBalanceCollection}
                          disabled={isCreatingCollection}
                        >
                          {isCreatingCollection ? 'Creating...' : 'Create Balance Collection'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-center py-2">
                      ₹{balance?.amount.toFixed(2) || '0.00'}
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
                      disabled={isProcessing || balance?.error}
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
                  {balance?.error ? (
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
