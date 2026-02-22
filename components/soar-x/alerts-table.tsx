'use client';

import { useState } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert } from './types';

const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Suspicious Login Attempt',
    description: 'Multiple failed login attempts detected',
    severity: 'high',
    riskScore: 87,
    timestamp: '2024-01-15 14:32:00',
    source: 'AUTH-01',
    targetIP: '192.168.1.105',
  },
  {
    id: '2',
    title: 'Lateral Movement Detected',
    description: 'Unusual network traffic pattern observed',
    severity: 'critical',
    riskScore: 95,
    timestamp: '2024-01-15 14:28:15',
    source: 'NET-02',
    targetIP: '10.0.0.42',
  },
  {
    id: '3',
    title: 'Malware Signature Match',
    description: 'Known malware signature detected in file',
    severity: 'critical',
    riskScore: 92,
    timestamp: '2024-01-15 14:25:30',
    source: 'AV-03',
    targetIP: '172.16.0.8',
  },
  {
    id: '4',
    title: 'Privilege Escalation Attempt',
    description: 'User attempted to elevate privileges',
    severity: 'high',
    riskScore: 78,
    timestamp: '2024-01-15 14:20:45',
    source: 'PRIV-04',
    targetIP: '192.168.1.50',
  },
  {
    id: '5',
    title: 'Data Exfiltration Suspected',
    description: 'Large volume of data transfer detected',
    severity: 'medium',
    riskScore: 65,
    timestamp: '2024-01-15 14:15:20',
    source: 'DLP-05',
    targetIP: '10.0.0.99',
  },
];

interface AlertsTableProps {
  loading?: boolean;
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'bg-red-900/20 text-red-400 border-red-800';
  if (score >= 60) return 'bg-amber-900/20 text-amber-400 border-amber-800';
  return 'bg-green-900/20 text-green-400 border-green-800';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-green-400';
    default:
      return 'text-gray-400';
  }
}

export function AlertsTable({ loading }: AlertsTableProps) {
  const [sortBy, setSortBy] = useState<'risk' | 'time'>('risk');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = mockAlerts.filter(
    (alert) =>
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.targetIP.includes(searchTerm)
  );

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'risk') {
      return b.riskScore - a.riskScore;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <Search className="w-full" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-border">
              <ArrowUpDown size={16} />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-border">
            <DropdownMenuItem onClick={() => setSortBy('risk')} className="cursor-pointer text-foreground focus:bg-secondary">
              Risk Score
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('time')} className="cursor-pointer text-foreground focus:bg-secondary">
              Timestamp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="gap-2 border-border">
          <Filter size={16} />
          Filter
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <Input
          placeholder="Search alerts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Alert</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Target IP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Risk Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48 bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20 bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32 bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16 bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16 bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32 bg-muted" />
                  </td>
                </tr>
              ))
            ) : sortedAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No alerts found
                </td>
              </tr>
            ) : (
              sortedAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{alert.source}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{alert.targetIP}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(alert.riskScore)}`}>
                      {alert.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold uppercase ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{alert.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {Math.min(5, sortedAlerts.length)} of {sortedAlerts.length} alerts</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border">
            Previous
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function Search({ className }: { className?: string }) {
  return null;
}
