'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, ChevronUp, ChevronDown, Eye, Copy, Share2 } from 'lucide-react';

interface AuditLog {
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

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2024-02-22 14:45:32',
    user: 'sarah.johnson@soar.com',
    action: 'Viewed Alert Details',
    resource: 'ALT-001 (Suspicious Login)',
    resourceType: 'alert',
    status: 'success',
    ipAddress: '192.168.1.45',
    details: 'User accessed critical alert details from dashboard'
  },
  {
    id: 'LOG-002',
    timestamp: '2024-02-22 14:32:18',
    user: 'admin@soar.com',
    action: 'Updated Security Policy',
    resource: 'Firewall Policy - Zone A',
    resourceType: 'policy',
    status: 'success',
    ipAddress: '10.0.0.5',
    details: 'Modified inbound rules for production environment'
  },
  {
    id: 'LOG-003',
    timestamp: '2024-02-22 14:15:45',
    user: 'james.carter@soar.com',
    action: 'Exported Report',
    resource: 'Weekly Security Report',
    resourceType: 'report',
    status: 'success',
    ipAddress: '192.168.1.78',
    details: 'Downloaded comprehensive security analysis report (PDF)'
  },
  {
    id: 'LOG-004',
    timestamp: '2024-02-22 13:58:22',
    user: 'analyst@soar.com',
    action: 'Failed Login Attempt',
    resource: 'User Session',
    resourceType: 'user',
    status: 'failure',
    ipAddress: '203.0.113.45',
    details: 'Invalid credentials from external IP address'
  },
  {
    id: 'LOG-005',
    timestamp: '2024-02-22 13:42:10',
    user: 'admin@soar.com',
    action: 'Created User Account',
    resource: 'new.analyst@soar.com',
    resourceType: 'user',
    status: 'success',
    ipAddress: '10.0.0.5',
    details: 'New analyst account provisioned with standard permissions'
  },
  {
    id: 'LOG-006',
    timestamp: '2024-02-22 13:28:55',
    user: 'sarah.johnson@soar.com',
    action: 'Modified Alert Threshold',
    resource: 'Anomaly Detection Rules',
    resourceType: 'config',
    status: 'success',
    ipAddress: '192.168.1.45',
    details: 'Updated severity threshold from 70 to 75 for network anomalies'
  },
  {
    id: 'LOG-007',
    timestamp: '2024-02-22 13:15:33',
    user: 'viewer@soar.com',
    action: 'Access Denied',
    resource: 'System Configuration',
    resourceType: 'system',
    status: 'failure',
    ipAddress: '192.168.1.89',
    details: 'Insufficient privileges to access configuration panel'
  },
  {
    id: 'LOG-008',
    timestamp: '2024-02-22 12:50:44',
    user: 'admin@soar.com',
    action: 'System Backup',
    resource: 'Database Backup - Full',
    resourceType: 'system',
    status: 'success',
    ipAddress: '10.0.0.5',
    details: 'Full database backup completed successfully (847.2 GB)'
  },
  {
    id: 'LOG-009',
    timestamp: '2024-02-22 12:32:19',
    user: 'james.carter@soar.com',
    action: 'Acknowledged Alert',
    resource: 'ALT-006 (DDoS Attack)',
    resourceType: 'alert',
    status: 'success',
    ipAddress: '192.168.1.78',
    details: 'Alert marked as acknowledged and assigned for investigation'
  },
  {
    id: 'LOG-010',
    timestamp: '2024-02-22 12:15:08',
    user: 'admin@soar.com',
    action: 'Configuration Change',
    resource: 'SIEM Integration Settings',
    resourceType: 'config',
    status: 'warning',
    ipAddress: '10.0.0.5',
    details: 'Critical setting modified - review recommended'
  }
];

type SortField = 'timestamp' | 'user' | 'action' | 'status';
type SortOrder = 'asc' | 'desc';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(MOCK_AUDIT_LOGS);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-destructive/20 text-destructive';
      case 'policy':
        return 'bg-warning/20 text-warning';
      case 'config':
        return 'bg-primary/20 text-primary';
      case 'user':
        return 'bg-accent/20 text-accent';
      case 'report':
        return 'bg-success/20 text-success';
      case 'system':
        return 'bg-muted/20 text-muted-foreground';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-success bg-success/10';
      case 'failure':
        return 'text-destructive bg-destructive/10';
      case 'warning':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  let filtered = logs.filter((log) => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResourceType = resourceTypeFilter === 'all' || log.resourceType === resourceTypeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesResourceType && matchesStatus;
  });

  filtered.sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit Logs</h1>
          <p className="text-muted-foreground">User activities and system events audit trail</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Events</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Successful</p>
            <p className="text-2xl font-bold text-success">{logs.filter(l => l.status === 'success').length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Failed</p>
            <p className="text-2xl font-bold text-destructive">{logs.filter(l => l.status === 'failure').length}</p>
          </Card>
          <Card className="bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Warnings</p>
            <p className="text-2xl font-bold text-warning">{logs.filter(l => l.status === 'warning').length}</p>
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
                  placeholder="Search user, action, resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            {/* Resource Type Filter */}
            <div className="w-full md:w-44">
              <label className="text-sm font-medium text-foreground mb-2 block">Resource Type</label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
              >
                <option value="all">All Types</option>
                <option value="user">User</option>
                <option value="alert">Alert</option>
                <option value="policy">Policy</option>
                <option value="config">Configuration</option>
                <option value="report">Report</option>
                <option value="system">System</option>
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
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            {/* Action Buttons */}
            <Button variant="outline" size="sm" className="border-border">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="bg-card border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
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
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('user')}
                    >
                      <div className="flex items-center gap-2">
                        User
                        {sortField === 'user' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('action')}
                    >
                      <div className="flex items-center gap-2">
                        Action
                        {sortField === 'action' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Resource</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">IP Address</th>
                    <th
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {sortField === 'status' && (
                          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-secondary/20 transition">
                      <td className="px-6 py-3 text-sm text-foreground font-mono">{log.timestamp}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{log.user}</td>
                      <td className="px-6 py-3 text-sm text-foreground font-medium">{log.action}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{log.resource}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${getResourceTypeColor(log.resourceType)}`}>
                          {log.resourceType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-muted-foreground">{log.ipAddress}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-secondary"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-secondary"
                          >
                            <Copy size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Log Details Modal */}
        {selectedLog && (
          <Card className="bg-card border border-border p-6 fixed inset-4 z-50 max-w-2xl mx-auto my-auto max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-foreground">Audit Log Details</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedLog(null)}
                className="hover:bg-secondary"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Log ID</p>
                <p className="text-foreground font-mono">{selectedLog.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Timestamp</p>
                <p className="text-foreground">{selectedLog.timestamp}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">User</p>
                <p className="text-foreground">{selectedLog.user}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Action</p>
                <p className="text-foreground">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Resource</p>
                <p className="text-foreground">{selectedLog.resource}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details</p>
                <p className="text-foreground text-sm">{selectedLog.details}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(selectedLog.status)}`}>
                  {selectedLog.status}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
