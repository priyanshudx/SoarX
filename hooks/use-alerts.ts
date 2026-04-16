'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSecurityAlerts, type SecurityAlert } from '@/lib/alerts-service';
import { supabase } from '@/lib/supabase';

export function useAlerts(limit = 100, userEmail?: string) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchSecurityAlerts(limit, userEmail);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, userEmail]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !userEmail) {
      return;
    }

    const channel = supabase
      .channel(`alerts:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `source=eq.${userEmail}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [refresh, userEmail]);

  return {
    alerts,
    isLoading,
    error,
    refresh,
  };
}
