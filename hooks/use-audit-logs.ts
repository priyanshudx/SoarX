'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLogEntry } from '@/lib/audit-logs-service';

export function useAuditLogs(limit = 200) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAuditLogs(limit);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    logs,
    isLoading,
    error,
    refresh,
  };
}
