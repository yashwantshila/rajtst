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

    // Always claim the lock for this tab. If another tab is already active,
    // it will receive a storage event and handle the logout itself. This
    // prevents leftover stale locks from forcing an immediate logout when
    // signing in again after a crash or unexpected close.
    localStorage.setItem(TAB_LOCK_KEY, tabId);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (localStorage.getItem(TAB_LOCK_KEY) === tabId) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    };
  }, [isAuthenticated]);
};
