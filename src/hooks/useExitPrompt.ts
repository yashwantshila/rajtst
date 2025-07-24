import { useEffect, useCallback } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';

export const useExitPrompt = (
  when: boolean,
  onExit: () => Promise<void> | void,
) => {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('Do you really want to exit?');
      if (proceed) {
        Promise.resolve(onExit()).finally(() => {
          setTimeout(blocker.proceed, 0);
        });
      } else {
        blocker.reset();
      }
    }
  }, [blocker, onExit]);

  useBeforeUnload(
    useCallback(
      (e: BeforeUnloadEvent) => {
        if (when) {
          e.preventDefault();
          e.returnValue = '';
        }
      },
      [when],
    ),
  );
};
