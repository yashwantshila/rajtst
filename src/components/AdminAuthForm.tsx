import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SanitizedInput } from '@/components/ui/sanitized-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { loginAdmin } from '@/services/api/adminAuth';

const AdminAuthForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format and domain (gmail.com only)
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid Gmail address (only gmail.com domain is allowed)');
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await loginAdmin(email, password);
      toast.success('Admin login successful');
      navigate('/admin');
    } catch (error: any) {
      // Show user-friendly error message without logging to console
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <Card className="glass-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Admin Login</CardTitle>
          <CardDescription>Access the administration panel</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleAdminLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <SanitizedInput
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={setEmail}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login as Admin'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminAuthForm;
