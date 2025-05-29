import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentAdmin, refreshAdminToken, logoutAdmin } from '@/services/api/adminAuth';

const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

export const useAdminSession = () => {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ADMIN_SESSION_TIMEOUT);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    setShowWarning(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutAdmin();
      toast.info('Your admin session has expired. Please log in again.');
      navigate('/admin-auth');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to logout properly');
    }
  }, [navigate]);

  const resetSession = useCallback(() => {
    clearTimers();
    
    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      toast.warning('Your admin session will expire in 5 minutes');
    }, ADMIN_SESSION_TIMEOUT - SESSION_WARNING_TIME);

    // Set logout timer
    timeoutRef.current = setTimeout(handleLogout, ADMIN_SESSION_TIMEOUT);
    
    // Reset time left
    setTimeLeft(ADMIN_SESSION_TIMEOUT);
  }, [clearTimers, handleLogout]);

  const refreshSession = useCallback(async () => {
    const admin = getCurrentAdmin();
    if (admin?.isAdmin) {
      try {
        // Refresh the Firebase token
        await refreshAdminToken();
        resetSession();
        return true;
      } catch (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
    }
    return false;
  }, [resetSession]);

  useEffect(() => {
    // Set up event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = async () => {
      if (await refreshSession()) {
        setShowWarning(false);
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial session setup
    resetSession();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [clearTimers, refreshSession, resetSession]);

  // Update time left every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1000;
        return newTime <= 0 ? 0 : newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    showWarning,
    timeLeft,
    refreshSession,
    resetSession
  };
}; 