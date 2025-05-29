import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { logoutUser } from '../services/firebase/auth';
import { useNavigate } from 'react-router-dom';

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

interface SessionTimerProps {
  isAuthenticated: boolean;
  onReset: () => void;
  className?: string;
  hideIcon?: boolean;
}

export const SessionTimer = ({ isAuthenticated, onReset, className, hideIcon = false }: SessionTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('user');
      localStorage.removeItem('adminAuth');
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setTimeLeft(SESSION_TIMEOUT);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1000;
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          handleLogout();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      setTimeLeft(SESSION_TIMEOUT);
    }
  }, [isAuthenticated, onReset]);

  if (!isAuthenticated) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className={`text-sm font-medium flex items-center ${className || ''}`}>
      {!hideIcon && <Clock className="h-4 w-4 mr-1" />}
      {`${minutes}:${seconds.toString().padStart(2, '0')}`}
    </div>
  );
}; 