import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logoutUser } from '@/services/firebase/auth';
import { removeCookie } from '@/utils/cookies';
import { toast } from 'sonner';

const TAB_LOCK_KEY = 'active_tab_lock';

export const useSingleTabEnforcer = (isAuthenticated: boolean) => {
  const tabIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const tabId = tabIdRef.current;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === TAB_LOCK_KEY && event.newValue && event.newValue !== tabId) {
        toast.error('Session active in another tab.');
        logoutUser().finally(() => {
          removeCookie('user');
          removeCookie('adminAuth');
          window.location.href = '/auth';
        });
      }
    };

    const handleBeforeUnload = () => {
      if (localStorage.getItem(TAB_LOCK_KEY) === tabId) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    };

    const existingLock = localStorage.getItem(TAB_LOCK_KEY);
    if (existingLock && existingLock !== tabId) {
      handleStorage(new StorageEvent('storage', { key: TAB_LOCK_KEY, newValue: existingLock }));
    } else {
      localStorage.setItem(TAB_LOCK_KEY, tabId);
      window.addEventListener('storage', handleStorage);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (localStorage.getItem(TAB_LOCK_KEY) === tabId) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    };
  }, [isAuthenticated]);
};
