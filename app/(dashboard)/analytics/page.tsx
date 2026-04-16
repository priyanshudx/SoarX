'use client';

import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/context/auth-context';

const threatPalette: Record<string, string> = {
  Malware: '#ef4444',
  Phishing: '#f59e0b',
  'Data Exfiltration': '#06b6d4',
  'Privilege Escalation': '#3b82f6',
  'Lateral Movement': '#10b981',
  Other: '#9ca3af',
};

type ExplainabilityMeta = {
  schema?: string;
  indicators?: string[];
};

function extractJsonObjectAfterPrefix(content: string, prefix: string): string | null {
  const prefixIndex = content.indexOf(prefix);
  if (prefixIndex === -1) return null;

  const jsonStart = content.indexOf('{', prefixIndex + prefix.length);
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = jsonStart; i < content.length; i += 1) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(jsonStart, i + 1);
      }
    }
  }

  return null;
}

function parseMetaJson(description: string): ExplainabilityMeta | null {
  const jsonRaw = extractJsonObjectAfterPrefix(description, 'meta_json=');
  if (!jsonRaw) return null;

  try {
    const parsed = JSON.parse(jsonRaw) as ExplainabilityMeta;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

type BasicAlert = {
  title: string;
  description: string;
  severity: string;
  riskScore: number;
  source: string;
  timestamp: string;
};

function classifyThreat(alert: Pick<BasicAlert, 'title' | 'description' | 'source'>): string {
  const value = `${alert.title} ${alert.description || ''} ${alert.source || ''}`.toLowerCase();
  const meta = parseMetaJson(alert.description);
  const indicators = Array.isArray(meta?.indicators)
    ? meta.indicators.map((item) => item.toLowerCase())
    : [];

  const hasIndicator = (...needles: string[]) =>
    indicators.some((indicator) => needles.some((needle) => indicator.includes(needle)));

  if (hasIndicator('phishing', 'credential', 'email', 'login')) {
    return 'Phishing';
  }

  if (hasIndicator('ransomware', 'malware', 'trojan', 'virus', 'worm')) {
    return 'Malware';
  }

  if (hasIndicator('exfiltration', 'data theft', 'data leak', 'stolen data', 'sensitive data')) {
    return 'Data Exfiltration';
  }

  if (hasIndicator('privilege escalation', 'elevation', 'admin access', 'root access')) {
    return 'Privilege Escalation';
  }

  if (hasIndicator('lateral movement', 'pivot', 'internal movement', 'remote host')) {
    return 'Lateral Movement';
  }

  if (
    value.includes('phishing') ||
    value.includes('credential') ||
    value.includes('login attempt') ||
    value.includes('suspicious email')
  ) {
    return 'Phishing';
  }

  if (
    value.includes('ransomware') ||
    value.includes('malware') ||
    value.includes('trojan') ||
    value.includes('virus') ||
    value.includes('worm')
  ) {
    return 'Malware';
  }

  if (
    value.includes('exfiltration') ||
    value.includes('data leak') ||
    value.includes('data theft') ||
    value.includes('downloaded sensitive') ||
    value.includes('stolen data')
  ) {
    return 'Data Exfiltration';
  }

  if (
    value.includes('privilege escalation') ||
    value.includes('elevation of privilege') ||
    value.includes('admin access') ||
    value.includes('root access')
  ) {
    return 'Privilege Escalation';
  }

  if (
    value.includes('lateral movement') ||
    value.includes('pivot') ||
    value.includes('internal movement') ||
    value.includes('remote host')
  ) {
    return 'Lateral Movement';
  }

  if (
    value.includes('sql injection') ||
    value.includes('sql-injection-pattern') ||
    value.includes('union select') ||
    value.includes('xss') ||
    value.includes('cross-site scripting') ||
    value.includes('path traversal') ||
    value.includes('command injection')
  ) {
    return 'Other';
  }

  return 'Other';
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildAlertTrendData(alerts: BasicAlert[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayBuckets: Array<{
    key: string;
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> = [];

  for (let i = 6; i >= 0; i -= 1) {
    const bucketDate = new Date(today);
    bucketDate.setDate(today.getDate() - i);
    dayBuckets.push({
      key: dayKey(bucketDate),
      date: formatDayLabel(bucketDate),
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
  }

  const indexByKey = new Map(dayBuckets.map((bucket, index) => [bucket.key, index]));

  for (const alert of alerts) {
    const parsed = new Date(alert.timestamp);
    if (Number.isNaN(parsed.getTime())) {
      continue;
    }

    const key = dayKey(parsed);
    const idx = indexByKey.get(key);
    if (idx === undefined) {
      continue;
    }

    const bucket = dayBuckets[idx];
    if (alert.severity === 'critical') bucket.critical += 1;
    else if (alert.severity === 'high') bucket.high += 1;
    else if (alert.severity === 'medium') bucket.medium += 1;
    else bucket.low += 1;
  }

  return dayBuckets.map(({ key: _key, ...rest }) => rest);
}

function buildThreatDistributionData(alerts: Pick<BasicAlert, 'title' | 'description' | 'source'>[]) {
  const counts = new Map<string, number>();

  for (const alert of alerts) {
    const category = classifyThreat(alert);
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  const total = alerts.length;

  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
    value: count,
    percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    color: threatPalette[name] || threatPalette.Other,
  })).sort((a, b) => b.count - a.count);
}

function buildSeverityDistributionData(alerts: Pick<BasicAlert, 'severity' | 'riskScore'>[]) {
  const critical = alerts.filter((a) => a.severity === 'critical');
  const high = alerts.filter((a) => a.severity === 'high');
  const medium = alerts.filter((a) => a.severity === 'medium');
  const low = alerts.filter((a) => a.severity === 'low');

  const toAverageRisk = (rows: Array<{ riskScore: number }>) => {
    if (!rows.length) return 0;
    return Math.round((rows.reduce((sum, row) => sum + row.riskScore, 0) / rows.length) * 10) / 10;
  };

  return [
    { name: 'Critical', incidents: critical.length, averageRisk: toAverageRisk(critical), color: '#ef4444' },
    { name: 'High', incidents: high.length, averageRisk: toAverageRisk(high), color: '#f59e0b' },
    { name: 'Medium', incidents: medium.length, averageRisk: toAverageRisk(medium), color: '#06b6d4' },
    { name: 'Low', incidents: low.length, averageRisk: toAverageRisk(low), color: '#10b981' },
  ];
}

function buildDetectionMethodsData(alerts: Pick<BasicAlert, 'source' | 'riskScore'>[]) {
  const grouped = new Map<string, { detections: number; prevented: number }>();

  for (const alert of alerts) {
    const method = alert.source?.trim() || 'Unknown';
    const current = grouped.get(method) || { detections: 0, prevented: 0 };
    current.detections += 1;
    if (alert.riskScore < 80) {
      current.prevented += 1;
    }
    grouped.set(method, current);
  }

  return Array.from(grouped.entries())
    .map(([method, stats]) => ({
      method,
      detections: stats.detections,
      prevention: stats.prevented,
      successRate: stats.detections > 0 ? Math.round((stats.prevented / stats.detections) * 100) : 0,
    }))
    .sort((a, b) => b.detections - a.detections)
    .slice(0, 8);
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { alerts, isLoading: loading } = useAlerts(1000, user?.email);

  const alertTrendsData = buildAlertTrendData(alerts);
  const threatDistributionData = buildThreatDistributionData(alerts);
  const severityDistributionData = buildSeverityDistributionData(alerts);
  const detectionMethodsData = buildDetectionMethodsData(alerts);
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
  const averageRiskScore =
    totalAlerts > 0 ? Math.round(alerts.reduce((sum, alert) => sum + alert.riskScore, 0) / totalAlerts) : 0;
  const preventionRate =
    totalAlerts > 0 ? Math.round((alerts.filter((a) => a.riskScore < 80).length / totalAlerts) * 100) : 0;

  if (loading) {
    return (
      <main className="pt-20 lg:ml-64 pb-8">
        <div className="p-6 lg:p-8">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 lg:ml-64 pb-8">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Security Analytics</h1>
          <p className="text-muted-foreground">Comprehensive threat analysis and security metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Alerts</p>
                <p className="text-2xl font-bold text-foreground">{totalAlerts}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingDown size={12} /> Synced with dashboard alerts
                </p>
              </div>
              <BarChart3 size={24} className="text-primary opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical Alerts</p>
                <p className="text-2xl font-bold text-error">{criticalAlerts}</p>
                <p className="text-xs text-error mt-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Real-time severity breakdown
                </p>
              </div>
              <AlertTriangle size={24} className="text-error opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Risk Score</p>
                <p className="text-2xl font-bold text-primary">{averageRiskScore}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingDown size={12} /> Computed from live alerts
                </p>
              </div>
              <TrendingUp size={24} className="text-primary opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Threats Mitigated</p>
                <p className="text-2xl font-bold text-success">{preventionRate}%</p>
                <p className="text-xs text-success mt-2">
                  Based on lower-risk alert ratio
                </p>
              </div>
              <PieChartIcon size={24} className="text-success opacity-20" />
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Alert Trends */}
          <Card className="bg-card border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Alert Trends (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={alertTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2749" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141b3a', border: '1px solid #1e2749', borderRadius: '8px' }}
                  labelStyle={{ color: '#e8eef7' }}
                />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="medium" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Threat Distribution */}
          <Card className="bg-card border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Threat Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={threatDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, payload }) => {
                    const percent = typeof payload?.percentage === 'number' ? payload.percentage : 0;
                    return `${name}: ${percent}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {threatDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141b3a', border: '1px solid #1e2749', borderRadius: '8px' }}
                  labelStyle={{ color: '#e8eef7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Severity Distribution */}
        <Card className="bg-card border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityDistributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2749" />
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141b3a', border: '1px solid #1e2749', borderRadius: '8px' }}
                labelStyle={{ color: '#e8eef7' }}
              />
              <Legend />
              <Bar dataKey="incidents" name="Incidents" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="averageRisk" name="Avg Risk Score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Detection Methods */}
        <Card className="bg-card border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Detection Methods Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={detectionMethodsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2749" />
              <XAxis dataKey="method" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141b3a', border: '1px solid #1e2749', borderRadius: '8px' }}
                labelStyle={{ color: '#e8eef7' }}
              />
              <Legend />
              <Bar dataKey="detections" name="Detections" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="prevention" name="Preventions" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Threats Table */}
        <Card className="bg-card border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Top Security Threats</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Threat Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Detections</th>
                  <th className="text-left py-3 px-4 font-semibold">Blocked</th>
                  <th className="text-left py-3 px-4 font-semibold">Success Rate</th>
                  <th className="text-left py-3 px-4 font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody>
                {threatDistributionData.map((threat) => (
                  <tr key={threat.name} className="border-b border-border hover:bg-secondary/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: threat.color }} />
                        <span className="text-foreground">{threat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{threat.count}</td>
                    <td className="py-3 px-4 text-foreground">{Math.round(threat.count * (preventionRate / 100))}</td>
                    <td className="py-3 px-4">
                      <span className="text-success font-semibold">{preventionRate}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-warning flex items-center gap-1">
                        <TrendingUp size={14} /> Live
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}

function AlertTriangle({ size, className }: { size: number; className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05l-8.47-14.14a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
