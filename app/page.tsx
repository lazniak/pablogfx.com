'use client';

import { useState, useEffect } from 'react';
import { getStoredPassword } from '@/lib/storage';
import LoginPage from './login/page';
import Terminal from '@/components/Terminal';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if logged in on mount
    const checkAuth = () => {
      const password = getStoredPassword();
      setIsLoggedIn(!!password);
    };
    
    checkAuth();
    
    // Check periodically for auth changes (when login happens)
    const interval = setInterval(checkAuth, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Show loading while checking
  if (isLoggedIn === null) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'VT323, monospace'
      }}>
        Loading...
      </div>
    );
  }

  // Show login or terminal based on auth state - URL stays as /
  if (isLoggedIn) {
    return <Terminal onLogout={handleLogout} />;
  } else {
    return <LoginPage />;
  }
}

