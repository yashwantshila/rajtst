import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logoutUser } from '../services/firebase/auth';

const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

export const useSessionTimeout = (isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('user');
      localStorage.removeItem('adminAuth');
      toast.info('Your session has expired. Please log in again.');
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const resetTimeout = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout if user is authenticated
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(handleLogout, SESSION_TIMEOUT);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Set up event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  return { resetTimeout };
}; 