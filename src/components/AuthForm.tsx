import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, resetPassword } from '../services/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SanitizedInput } from '@/components/ui/sanitized-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ZoomIn } from 'lucide-react';

const AuthForm = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');

  // Common passwords to check against
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'welcome',
    'letmein', 'monkey', 'dragon', 'baseball', 'football'
  ];

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    // Check minimum length
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    // Check for common passwords
    if (commonPasswords.includes(password.toLowerCase())) {
      return { isValid: false, message: 'Password is too common. Please choose a stronger password' };
    }

    return { isValid: true, message: 'Password is valid' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format and domain (gmail.com only)
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(loginEmail)) {
      toast.error('Please enter a valid Gmail address (only gmail.com domain is allowed)');
      return;
    }
    
    // Validate password length
    if (loginPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await loginUser(loginEmail, loginPassword);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error: any) {
      // Display the specific error message from Firebase
      toast.error(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format and domain (gmail.com only)
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(registerEmail)) {
      toast.error('Please enter a valid Gmail address (only gmail.com domain is allowed)');
      return;
    }
    
    // Validate password
    const passwordValidation = validatePassword(registerPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message);
      return;
    }
    
    // Validate username
    if (registerUsername.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await registerUser(registerEmail, registerPassword, registerUsername);
      toast.success('Account created successfully');
      navigate('/');
    } catch (error: any) {
      // Display the specific error message from Firebase
      toast.error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format and domain (gmail.com only)
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(resetEmail)) {
      toast.error('Please enter a valid Gmail address (only gmail.com domain is allowed)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent. Please check your inbox.');
      setIsResetMode(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="w-full max-w-md mx-auto animate-scale-in">
        <Card className="glass-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <SanitizedInput
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={setResetEmail}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsResetMode(false)}
              >
                Back to Login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <Card className="glass-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">RajTest</CardTitle>
          <CardDescription>Continue your learning journey</CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <SanitizedInput
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={setLoginEmail}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setIsResetMode(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <SanitizedInput
                    id="register-username"
                    placeholder="johndoe"
                    value={registerUsername}
                    onChange={setRegisterUsername}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <SanitizedInput
                    id="register-email"
                    type="email"
                    placeholder="name@example.com"
                    value={registerEmail}
                    onChange={setRegisterEmail}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li className={registerPassword.length >= 6 ? 'text-green-500' : 'text-red-500'}>
                        At least 6 characters long
                      </li>
                      <li className={/[0-9]/.test(registerPassword) ? 'text-green-500' : 'text-red-500'}>
                        At least one number
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
