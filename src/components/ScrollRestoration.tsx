import React, { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollRestoration: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (navigationType === 'POP') {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        window.scrollTo(0, parseInt(stored, 10));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [key, navigationType]);

  useEffect(() => {
    return () => {
      sessionStorage.setItem(key, window.scrollY.toString());
    };
  }, [key]);

  return null;
};

export default ScrollRestoration;
