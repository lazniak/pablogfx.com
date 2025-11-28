'use client';

import { useState, useEffect } from 'react';
import { getStoredPassword, removeStoredPassword } from '@/lib/storage';
import LoginPage from './login/page';
import Terminal from '@/components/Terminal';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Check if there's an active session (stored in sessionStorage, not localStorage)
    const sessionActive = sessionStorage.getItem('terminal_session_active') === 'true';
    
    if (sessionActive) {
      setIsLoggedIn(true);
    } else {
      // Always show login page on page load/refresh
      setIsLoggedIn(false);
      // Clear password from localStorage on page load to force re-login
      removeStoredPassword();
    }
  }, []);

  const handleLogout = () => {
    // Clear session
    sessionStorage.removeItem('terminal_session_active');
    removeStoredPassword();
    setIsLoggedIn(false);
  };

  // Always show login page initially
  if (!isLoggedIn) {
    return <LoginPage />;
  } else {
    return <Terminal onLogout={handleLogout} />;
  }
}

