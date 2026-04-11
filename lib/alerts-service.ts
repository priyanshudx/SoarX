import type { Alert } from '@/components/soar-x/types';
import { supabase, supabaseConfigError } from '@/lib/supabase';

export interface SecurityAlert extends Alert {
  status: 'open' | 'investigating' | 'resolved';
}

type AlertRow = {
  id?: string | number;
  title?: string;
  description?: string;
  severity?: string;
  risk_score?: number;
  timestamp?: string;
  source?: string;
  target_ip?: string;
  status?: string;
};

function normalizeSeverity(value: string | undefined): Alert['severity'] {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'low';
}

function normalizeStatus(value: string | undefined, riskScore: number): SecurityAlert['status'] {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'open' || normalized === 'investigating' || normalized === 'resolved') {
    return normalized;
  }

  if (riskScore >= 85) {
    return 'investigating';
  }
  if (riskScore >= 60) {
    return 'open';
  }
  return 'resolved';
}

function mapAlertRow(row: AlertRow, index: number): SecurityAlert {
  const riskScore = typeof row.risk_score === 'number' ? row.risk_score : 0;
  const severity = normalizeSeverity(row.severity);

  return {
    id: String(row.id ?? `generated-${index}`),
    title: row.title || 'Unnamed Alert',
    description: row.description || 'No description provided',
    severity,
    riskScore,
    timestamp: row.timestamp || new Date().toISOString(),
    source: row.source || 'unknown',
    targetIP: row.target_ip || '0.0.0.0',
    status: normalizeStatus(row.status, riskScore),
  };
}

export async function fetchSecurityAlerts(limit = 100): Promise<SecurityAlert[]> {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('id,title,description,severity,risk_score,timestamp,source,target_ip,status')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("Could not find the table 'public.alerts'")) {
      throw new Error(
        'Missing Supabase table public.alerts. Run migration supabase/migrations/20260410_create_alerts_table.sql in your Supabase SQL editor.'
      );
    }
    throw new Error(`Failed to load alerts: ${error.message}`);
  }

  const rows = (data || []) as AlertRow[];
  const remoteAlerts = rows.map(mapAlertRow);
  return remoteAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
