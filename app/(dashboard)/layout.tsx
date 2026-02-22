'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Sidebar } from '@/components/soar-x/sidebar';
import { Header } from '@/components/soar-x/header';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const hasCheckedAuthRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only check auth once during mount
    if (isMounted && !hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      }
    }
  }, [isMounted, isLoading, isAuthenticated, router]);

  // Show loading only on initial mount during auth check
  if (!isMounted || (isLoading && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="text-primary mx-auto animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login (this prevents showing content)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <Header />
      {children}
    </div>
  );
}
