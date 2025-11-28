'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Terminal from '@/components/Terminal';
import { getStoredPassword } from '@/lib/storage';

export default function TerminalPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in
    const password = getStoredPassword();
    if (!password) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    router.push('/login');
  };

  return <Terminal onLogout={handleLogout} />;
}

