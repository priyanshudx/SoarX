'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const alertTrendsData = [
  { date: 'Feb 16', critical: 12, high: 28, medium: 45, low: 32 },
  { date: 'Feb 17', critical: 18, high: 35, medium: 52, low: 38 },
  { date: 'Feb 18', critical: 15, high: 32, medium: 48, low: 35 },
  { date: 'Feb 19', critical: 22, high: 41, medium: 61, low: 42 },
  { date: 'Feb 20', critical: 19, high: 38, medium: 55, low: 40 },
  { date: 'Feb 21', critical: 25, high: 45, medium: 68, low: 48 },
  { date: 'Feb 22', critical: 28, high: 52, medium: 74, low: 51 }
];

const threatDistributionData = [
  { name: 'Malware', value: 28, color: '#ef4444' },
  { name: 'Phishing', value: 22, color: '#f59e0b' },
  { name: 'Data Exfiltration', value: 18, color: '#06b6d4' },
  { name: 'Privilege Escalation', value: 16, color: '#3b82f6' },
  { name: 'DDoS', value: 12, color: '#10b981' },
  { name: 'Other', value: 4, color: '#9ca3af' }
];

const severityDistributionData = [
  { name: 'Critical', value: 145, incidents: 12, color: '#ef4444' },
  { name: 'High', value: 312, incidents: 28, color: '#f59e0b' },
  { name: 'Medium', value: 528, incidents: 45, color: '#06b6d4' },
  { name: 'Low', value: 356, incidents: 32, color: '#10b981' }
];

const detectionMethodsData = [
  { method: 'IDS/IPS', detections: 245, prevention: 92 },
  { method: 'SIEM', detections: 189, prevention: 78 },
  { method: 'EDR', detections: 156, prevention: 68 },
  { method: 'WAF', detections: 134, prevention: 61 },
  { method: 'DNS Filter', detections: 98, prevention: 45 }
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load immediately without artificial delay
    setLoading(false);
  }, []);

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
                <p className="text-2xl font-bold text-foreground">1,341</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingDown size={12} /> 8% vs previous week
                </p>
              </div>
              <BarChart3 size={24} className="text-primary opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical Alerts</p>
                <p className="text-2xl font-bold text-error">47</p>
                <p className="text-xs text-error mt-2 flex items-center gap-1">
                  <TrendingUp size={12} /> 12% increase
                </p>
              </div>
              <AlertTriangle size={24} className="text-error opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Response Time</p>
                <p className="text-2xl font-bold text-primary">14m 32s</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingDown size={12} /> 2m faster than average
                </p>
              </div>
              <TrendingUp size={24} className="text-primary opacity-20" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Threats Mitigated</p>
                <p className="text-2xl font-bold text-success">94.2%</p>
                <p className="text-xs text-success mt-2">
                  Prevention rate
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
