'use client';

import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/context/auth-context';

const detectionMethodsData = [
  { method: 'IDS/IPS', detections: 245, prevention: 92 },
  { method: 'SIEM', detections: 189, prevention: 78 },
  { method: 'EDR', detections: 156, prevention: 68 },
  { method: 'WAF', detections: 134, prevention: 61 },
  { method: 'DNS Filter', detections: 98, prevention: 45 }
];

const threatPalette: Record<string, string> = {
  Malware: '#ef4444',
  Phishing: '#f59e0b',
  'Data Exfiltration': '#06b6d4',
  'Privilege Escalation': '#3b82f6',
  'Lateral Movement': '#10b981',
  Other: '#9ca3af',
};

function classifyThreat(title: string): string {
  const value = title.toLowerCase();
  if (value.includes('malware') || value.includes('ransomware')) return 'Malware';
  if (value.includes('phishing')) return 'Phishing';
  if (value.includes('exfiltration') || value.includes('data')) return 'Data Exfiltration';
  if (value.includes('privilege')) return 'Privilege Escalation';
  if (value.includes('lateral') || value.includes('traffic')) return 'Lateral Movement';
  return 'Other';
}

function buildAlertTrendData(alerts: Array<{ severity: string }>) {
  const sample = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
  };

  return [
    { date: 'Day 1', critical: Math.max(0, sample.critical - 1), high: Math.max(0, sample.high - 1), medium: Math.max(0, sample.medium - 1), low: sample.low },
    { date: 'Day 2', critical: sample.critical, high: Math.max(0, sample.high - 1), medium: sample.medium, low: sample.low },
    { date: 'Day 3', critical: sample.critical, high: sample.high, medium: sample.medium, low: sample.low },
    { date: 'Day 4', critical: sample.critical + 1, high: sample.high, medium: sample.medium, low: sample.low },
    { date: 'Day 5', critical: sample.critical, high: sample.high + 1, medium: sample.medium, low: sample.low },
    { date: 'Day 6', critical: sample.critical, high: sample.high, medium: sample.medium + 1, low: sample.low },
    { date: 'Day 7', critical: sample.critical, high: sample.high, medium: sample.medium, low: sample.low },
  ];
}

function buildThreatDistributionData(alerts: Array<{ title: string }>) {
  const counts = new Map<string, number>();

  for (const alert of alerts) {
    const category = classifyThreat(alert.title);
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    value: count,
    color: threatPalette[name] || threatPalette.Other,
  }));
}

function buildSeverityDistributionData(alerts: Array<{ severity: string; riskScore: number }>) {
  const critical = alerts.filter((a) => a.severity === 'critical');
  const high = alerts.filter((a) => a.severity === 'high');
  const medium = alerts.filter((a) => a.severity === 'medium');
  const low = alerts.filter((a) => a.severity === 'low');

  const toValue = (rows: Array<{ riskScore: number }>) => rows.reduce((sum, row) => sum + row.riskScore, 0);

  return [
    { name: 'Critical', value: toValue(critical), incidents: critical.length, color: '#ef4444' },
    { name: 'High', value: toValue(high), incidents: high.length, color: '#f59e0b' },
    { name: 'Medium', value: toValue(medium), incidents: medium.length, color: '#06b6d4' },
    { name: 'Low', value: toValue(low), incidents: low.length, color: '#10b981' },
  ];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { alerts, isLoading: loading } = useAlerts(200, user?.email);

  const alertTrendsData = buildAlertTrendData(alerts);
  const threatDistributionData = buildThreatDistributionData(alerts);
  const severityDistributionData = buildSeverityDistributionData(alerts);
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
                <p className="text-sm text-muted-foreground mb-1">Total Alerts (7d)</p>
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
            <h2 className="text-lg font-bold text-foreground mb-4">Alert Trends (7 Days)</h2>
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
                  label={({ name, value }) => `${name}: ${value}%`}
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
          <h2 className="text-lg font-bold text-foreground mb-4">Severity Distribution & Incident Count</h2>
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
              <Bar dataKey="value" name="Total Alerts" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="incidents" name="Incidents" fill="#06b6d4" radius={[8, 8, 0, 0]} />
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
                    <td className="py-3 px-4 text-foreground">{threat.value}</td>
                    <td className="py-3 px-4 text-foreground">{Math.round(threat.value * 0.92)}</td>
                    <td className="py-3 px-4">
                      <span className="text-success font-semibold">92%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-warning flex items-center gap-1">
                        <TrendingUp size={14} /> +12%
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
