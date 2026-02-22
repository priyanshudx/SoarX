'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Search, Download, Filter, ChevronUp, ChevronDown } from 'lucide-react';

interface Alert {
  id: string;
  timestamp: string;
  threat: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  source: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
}

const MOCK_ALERTS: Alert[] = [
  {
    id: 'ALT-001',
    timestamp: '2024-02-22 14:32:45',
    threat: 'Suspicious Login Attempt',
    severity: 'critical',
    riskScore: 95,
    source: '192.168.1.102',
    description: 'Multiple failed login attempts followed by successful access from unusual location',
    status: 'investigating'
  },
  {
    id: 'ALT-002',
    timestamp: '2024-02-22 13:18:22',
    threat: 'Malware Detection',
    severity: 'high',
    riskScore: 87,
    source: 'endpoint-srv-04',
    description: 'Trojan.GenericKD detected in system memory',
    status: 'open'
  },
  {
    id: 'ALT-003',
    timestamp: '2024-02-22 11:45:12',
    threat: 'Data Exfiltration',
    severity: 'high',
    riskScore: 82,
    source: 'user-terminal-07',
    description: 'Large data transfer to external IP detected',
    status: 'investigating'
  },
  {
    id: 'ALT-004',
    timestamp: '2024-02-22 10:22:33',
    threat: 'SQL Injection Attempt',
    severity: 'medium',
    riskScore: 65,
    source: 'web-app-01',
    description: 'SQL injection pattern detected in web application logs',
    status: 'open'
  },
  {
    id: 'ALT-005',
    timestamp: '2024-02-22 09:15:44',
    threat: 'Privilege Escalation',
    severity: 'high',
    riskScore: 79,
    source: 'admin-workstation',
    description: 'Unauthorized privilege escalation attempt detected',
    status: 'resolved'
  },
  {
    id: 'ALT-006',
    timestamp: '2024-02-22 08:30:21',
    threat: 'DDoS Attack',
    severity: 'critical',
    riskScore: 92,
    source: '10.0.0.0/8',
    description: 'Large-scale distributed denial of service attack in progress',
    status: 'investigating'
  },
  {
    id: 'ALT-007',
    timestamp: '2024-02-22 07:45:18',
    threat: 'Phishing Email',
    severity: 'medium',
    riskScore: 58,
    source: 'mail-gateway',
    description: 'Email with malicious attachment targeting executives',
    status: 'open'
  },
  {
    id: 'ALT-008',
    timestamp: '2024-02-22 06:20:09',
    threat: 'Ransomware Activity',
    severity: 'critical',
    riskScore: 98,
    source: 'file-server-02',
    description: 'Ransomware encryption activity detected on network shares',
    status: 'open'
  }
];

type SortField = 'timestamp' | 'riskScore' | 'severity';
type SortOrder = 'asc' | 'desc';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    // Load data immediately without artificial delay
    setAlerts(MOCK_ALERTS);
    setLoading(false);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error text-white';
      case 'high':
        return 'bg-warning text-white';
      case 'medium':
        return 'bg-accent text-primary-foreground';
      case 'low':
        return 'bg-success text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-destructive bg-destructive/10';
      case 'investigating':
        return 'text-warning bg-warning/10';
      case 'resolved':
        return 'text-success bg-success/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  const filtered = useMemo(() => {
    let result = alerts.filter((alert) => {
      const matchesSearch = alert.threat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return result;
  }, [alerts, searchTerm, severityFilter, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <main className="pt-20 lg:ml-64 pb-8">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Security Alerts</h1>
          <p className="text-muted-foreground">Real-time threat detection and alert management</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Alerts</p>
            <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Critical</p>
            <p className="text-2xl font-bold text-error">{alerts.filter(a => a.severity === 'critical').length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Open</p>
            <p className="text-2xl font-bold text-warning">{alerts.filter(a => a.status === 'open').length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Risk Score</p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(alerts.reduce((sum, a) => sum + a.riskScore, 0) / alerts.length)}
            </p>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="bg-card border border-border p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search threats, sources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <div className="w-full md:w-40">
              <label className="text-sm font-medium text-foreground mb-2 block">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-border">
                <Filter size={16} className="mr-2" />
                Reset
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Alerts Table */}
        <Card className="bg-card border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Threat</th>
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('timestamp')}
                    >
                      <div className="flex items-center gap-2">
                        Timestamp
                        {sortField === 'timestamp' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Source</th>
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('riskScore')}
                    >
                      <div className="flex items-center gap-2">
                        Risk Score
                        {sortField === 'riskScore' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('severity')}
                    >
                      <div className="flex items-center gap-2">
                        Severity
                        {sortField === 'severity' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((alert) => (
                    <tr key={alert.id} className="border-b border-border hover:bg-secondary/20 transition">
                      <td className="px-6 py-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="text-warning mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{alert.threat}</p>
                            <p className="text-xs text-muted-foreground">{alert.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground">{alert.timestamp}</td>
                      <td className="px-6 py-3 text-sm font-mono text-muted-foreground">{alert.source}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                alert.riskScore >= 80 ? 'bg-error' : alert.riskScore >= 60 ? 'bg-warning' : 'bg-success'
                              }`}
                              style={{ width: `${alert.riskScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{alert.riskScore}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(alert.status)}`}>
                          {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
