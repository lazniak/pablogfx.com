'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredPassword } from '@/lib/storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#2d0922',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'Ubuntu Mono, monospace'
    }}>
      Loading...
    </div>
  );
}

