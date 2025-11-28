'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Terminal from '@/components/Terminal';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if there's an active session (stored in sessionStorage)
    const sessionActive = sessionStorage.getItem('terminal_session_active') === 'true';
    
    if (sessionActive) {
      setIsLoggedIn(true);
    } else {
      // Redirect to login page
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    // Clear session but keep the password (for next login)
    sessionStorage.removeItem('terminal_session_active');
    setIsLoggedIn(false);
    // Redirect to login
    router.replace('/login');
  };

  // Show nothing while checking session
  if (isLoggedIn === null) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00ff00',
        fontFamily: 'VT323, monospace'
      }}>
        <span style={{ animation: 'blink 1s infinite' }}>█</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // Will redirect
  }

  return <Terminal onLogout={handleLogout} />;
}

