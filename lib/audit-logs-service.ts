import { supabase, supabaseConfigError } from '@/lib/supabase';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceType: 'user' | 'alert' | 'policy' | 'config' | 'report' | 'system';
  status: 'success' | 'failure' | 'warning';
  ipAddress: string;
  details: string;
}

type AuditLogRow = {
  id?: string | number;
  timestamp?: string;
  user_email?: string;
  action?: string;
  resource?: string;
  resource_type?: string;
  status?: string;
  ip_address?: string;
  details?: string;
};

function normalizeResourceType(value: string | undefined): AuditLogEntry['resourceType'] {
  const normalized = (value || '').toLowerCase();
  if (
    normalized === 'user' ||
    normalized === 'alert' ||
    normalized === 'policy' ||
    normalized === 'config' ||
    normalized === 'report' ||
    normalized === 'system'
  ) {
    return normalized;
  }
  return 'system';
}

function normalizeStatus(value: string | undefined): AuditLogEntry['status'] {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'success' || normalized === 'failure' || normalized === 'warning') {
    return normalized;
  }
  return 'warning';
}

function mapAuditLogRow(row: AuditLogRow, index: number): AuditLogEntry {
  return {
    id: String(row.id ?? `audit-${index}`),
    timestamp: row.timestamp || new Date().toISOString(),
    user: row.user_email || 'unknown@soar.local',
    action: row.action || 'Unknown Action',
    resource: row.resource || 'Unknown Resource',
    resourceType: normalizeResourceType(row.resource_type),
    status: normalizeStatus(row.status),
    ipAddress: row.ip_address || '0.0.0.0',
    details: row.details || 'No details available',
  };
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,timestamp,user_email,action,resource,resource_type,status,ip_address,details')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("Could not find the table 'public.audit_logs'")) {
      throw new Error(
        'Missing Supabase table public.audit_logs. Run migration supabase/migrations/20260410_create_audit_logs_table.sql in your Supabase SQL editor.'
      );
    }
    throw new Error(`Failed to load audit logs: ${error.message}`);
  }

  const rows = (data || []) as AuditLogRow[];
  const remoteLogs = rows.map(mapAuditLogRow);
  return remoteLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
