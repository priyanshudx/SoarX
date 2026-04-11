'use client';

import { useEffect, useMemo, useState } from 'react';
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

interface AlertsTableProps {
  loading?: boolean;
  alerts?: Alert[];
}

const ALERTS_PER_PAGE = 15;

function shortAlertTitle(title: string, maxLength = 34): string {
  if (title.length <= maxLength) {
    return title;
  }

  return `${title.slice(0, maxLength - 3)}...`;
}

function shortAlertDescription(description: string, maxLength = 88): string {
  const compact = description
    .replace(/meta_json=\{.*?\}\s*\|?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
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

export function AlertsTable({ loading, alerts = [] }: AlertsTableProps) {
  const [sortBy, setSortBy] = useState<'risk' | 'time'>('risk');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAlerts = alerts.filter(
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

  const totalPages = Math.max(1, Math.ceil(sortedAlerts.length / ALERTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * ALERTS_PER_PAGE;
    return sortedAlerts.slice(startIndex, startIndex + ALERTS_PER_PAGE);
  }, [currentPage, sortedAlerts]);

  const { startPage, endPage } = useMemo(() => {
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, currentPage - halfWindow);
    let end = Math.min(totalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    return { startPage: start, endPage: end };
  }, [currentPage, totalPages]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [endPage, startPage]);

  const totalAlerts = sortedAlerts.length;
  const showingStart = totalAlerts === 0 ? 0 : (currentPage - 1) * ALERTS_PER_PAGE + 1;
  const showingEnd = totalAlerts === 0 ? 0 : Math.min(currentPage * ALERTS_PER_PAGE, totalAlerts);

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
      <div className="overflow-auto max-h-[660px]">
        <table className="w-full table-fixed">
          <thead className="border-b border-border bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[36%]">Alert</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[14%]">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[18%]">Target IP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[12%]">Risk Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[10%]">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[10%]">Time</th>
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
              paginatedAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" title={alert.title}>{shortAlertTitle(alert.title)}</p>
                      <p className="text-xs text-muted-foreground truncate" title={alert.description}>{shortAlertDescription(alert.description)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground truncate" title={alert.source}>{alert.source}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground truncate" title={alert.targetIP}>{alert.targetIP}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(alert.riskScore)}`}>
                      {alert.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold uppercase whitespace-nowrap ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate" title={alert.timestamp}>{alert.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {showingStart}-{showingEnd} of {totalAlerts} alerts
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? 'default' : 'outline'}
                size="sm"
                className="min-w-9 border-border"
                onClick={() => setCurrentPage(pageNumber)}
                disabled={loading}
              >
                {pageNumber}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
          >
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
