'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSecurityAlerts, type SecurityAlert } from '@/lib/alerts-service';

export function useAlerts(limit = 100) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchSecurityAlerts(limit);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    alerts,
    isLoading,
    error,
    refresh,
  };
}
