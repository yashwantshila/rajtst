import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { AdminSessionTimer } from './AdminSessionTimer';

interface AdminHeaderProps {
  onLogout: () => void;
}

export const AdminHeader = ({ onLogout }: AdminHeaderProps) => {
  return (
    <header className="border-b bg-background/60 backdrop-blur-md sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <AdminSessionTimer />
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
};
