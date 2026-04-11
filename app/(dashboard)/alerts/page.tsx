'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Search, Download, Filter, ChevronUp, ChevronDown, Server } from 'lucide-react';
import { useAlerts } from '@/hooks/use-alerts';
import type { SecurityAlert } from '@/lib/alerts-service';

type SortField = 'timestamp' | 'riskScore' | 'severity';
type SortOrder = 'asc' | 'desc';

type ExplainabilityMeta = {
  schema?: string;
  request?: string | null;
  status_code?: number | null;
  source?: string;
  target_ip?: string | null;
  prediction_label?: string | null;
  confidence?: number | null;
  model_risk?: number | null;
  heuristic_risk?: number | null;
  final_risk?: number | null;
  indicators?: string[];
  severity?: string;
  status?: string;
  timestamp?: string;
  raw?: string;
};

type AlertInsight = {
  request: string | null;
  predictionLabel: string | null;
  confidencePct: number | null;
  modelRisk: number | null;
  heuristicRisk: number | null;
  finalRisk: number;
  indicators: string[];
  raw: string | null;
  hasStructuredMetadata: boolean;
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
    if (inString) continue;

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

function extractLegacyPart(description: string, key: string): string {
  const match = description.match(new RegExp(`${key}=([^|]+)`, 'i'));
  return match ? match[1].trim() : '';
}

function parseLegacyIndicators(description: string): string[] {
  const value = extractLegacyPart(description, 'indicators').toLowerCase();
  if (!value || value === 'none') return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConfidence(value: number | null): number | null {
  if (value === null) return null;
  return value <= 1 ? value * 100 : Math.min(value, 100);
}

function toFriendlyIndicatorName(indicator: string): string {
  return indicator
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAlertInsight(alert: SecurityAlert): AlertInsight {
  const meta = parseMetaJson(alert.description);

  const confidence = typeof meta?.confidence === 'number'
    ? normalizeConfidence(meta.confidence)
    : normalizeConfidence(parseNumber(extractLegacyPart(alert.description, 'confidence')));

  const modelRisk = typeof meta?.model_risk === 'number'
    ? meta.model_risk
    : parseNumber(extractLegacyPart(alert.description, 'model_risk'));

  const heuristicRisk = typeof meta?.heuristic_risk === 'number'
    ? meta.heuristic_risk
    : parseNumber(extractLegacyPart(alert.description, 'heuristic_risk'));

  const finalRisk = typeof meta?.final_risk === 'number'
    ? meta.final_risk
    : parseNumber(extractLegacyPart(alert.description, 'final_risk')) ?? alert.riskScore;

  const indicators = Array.isArray(meta?.indicators)
    ? meta.indicators.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : parseLegacyIndicators(alert.description);

  return {
    request: meta?.request || extractLegacyPart(alert.description, 'request') || null,
    predictionLabel: meta?.prediction_label || extractLegacyPart(alert.description, 'AI') || null,
    confidencePct: confidence,
    modelRisk,
    heuristicRisk,
    finalRisk,
    indicators,
    raw: meta?.raw || extractLegacyPart(alert.description, 'raw') || null,
    hasStructuredMetadata: Boolean(meta?.schema),
  };
}

function buildAiExplanation(alert: SecurityAlert, insight: AlertInsight): string {
  const parts: string[] = [];

  parts.push(`Event ${alert.title} from ${alert.source} was scored at risk ${insight.finalRisk.toFixed(2)}.`);

  if (insight.predictionLabel) {
    parts.push(`AI label: ${insight.predictionLabel}.`);
  }

  if (insight.confidencePct !== null) {
    parts.push(`Model confidence: ${insight.confidencePct.toFixed(2)}%.`);
  }

  if (insight.modelRisk !== null && insight.heuristicRisk !== null) {
    parts.push(
      `Risk composition used model score ${insight.modelRisk.toFixed(2)} and heuristic score ${insight.heuristicRisk.toFixed(2)}.`
    );
  }

  if (insight.indicators.length > 0) {
    parts.push(`Detected indicators: ${insight.indicators.map(toFriendlyIndicatorName).join(', ')}.`);
  } else {
    parts.push('No explicit attack indicators were extracted for this event.');
  }

  if (insight.request) {
    parts.push(`Observed request: ${insight.request}.`);
  }

  return parts.join(' ');
}

function shortAlertTitle(title: string, maxLength = 36): string {
  if (title.length <= maxLength) {
    return title;
  }

  return `${title.slice(0, maxLength - 3)}...`;
}

function shortAlertDescription(description: string, maxLength = 96): string {
  const compact = description
    .replace(/meta_json=\{.*?\}\s*\|?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

export default function AlertsPage() {
  const { alerts, isLoading: loading, error } = useAlerts(200);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    const result = alerts.filter((alert) => {
      const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const selectedInsight = selectedAlert ? buildAlertInsight(selectedAlert) : null;

  return (
    <main className="pt-20 lg:ml-64 pb-8">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Security Alerts</h1>
          <p className="text-muted-foreground">Real-time threat detection and alert management</p>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
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
              {alerts.length ? Math.round(alerts.reduce((sum, a) => sum + a.riskScore, 0) / alerts.length) : 0}
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
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground w-[34%]">Threat</th>
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
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate" title={alert.title}>{shortAlertTitle(alert.title)}</p>
                            <p className="text-xs text-muted-foreground truncate" title={alert.description}>{shortAlertDescription(alert.description)}</p>
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
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-primary hover:bg-primary/10"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setIsDetailsOpen(true);
                          }}
                        >
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

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Alert Event Details</DialogTitle>
              <DialogDescription>
                Full event context with AI explanation and scoring breakdown
              </DialogDescription>
            </DialogHeader>

            {selectedAlert && selectedInsight && (
              <div className="space-y-5 min-w-0">
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">AI Explanation</h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {buildAiExplanation(selectedAlert, selectedInsight)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Alert Name</p>
                    <p className="text-sm font-medium text-foreground break-words">{selectedAlert.title}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium text-foreground break-words">{selectedAlert.source}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Target IP</p>
                    <p className="text-sm font-mono text-foreground break-all">{selectedAlert.targetIP}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Timestamp</p>
                    <p className="text-sm text-foreground break-words">{selectedAlert.timestamp}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Severity / Status</p>
                    <p className="text-sm text-foreground">{selectedAlert.severity} / {selectedAlert.status}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Final Risk Score</p>
                    <p className="text-sm font-semibold text-foreground">{selectedInsight.finalRisk.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Prediction Label</p>
                    <p className="text-sm text-foreground">{selectedInsight.predictionLabel || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Model Confidence</p>
                    <p className="text-sm text-foreground">
                      {selectedInsight.confidencePct === null ? 'N/A' : `${selectedInsight.confidencePct.toFixed(2)}%`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Metadata Type</p>
                    <p className="text-sm text-foreground">
                      {selectedInsight.hasStructuredMetadata ? 'Structured (meta_json)' : 'Legacy parsed'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Model Risk</p>
                    <p className="text-sm text-foreground">
                      {selectedInsight.modelRisk === null ? 'N/A' : selectedInsight.modelRisk.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-xs text-muted-foreground">Heuristic Risk</p>
                    <p className="text-sm text-foreground">
                      {selectedInsight.heuristicRisk === null ? 'N/A' : selectedInsight.heuristicRisk.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Detected Indicators</p>
                  {selectedInsight.indicators.length === 0 ? (
                    <p className="text-sm text-foreground">None</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedInsight.indicators.map((indicator) => (
                        <span key={indicator} className="rounded-full border border-cyan-800 bg-cyan-900/20 px-2 py-0.5 text-xs text-cyan-300">
                          {toFriendlyIndicatorName(indicator)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 min-w-0">
                  <p className="text-xs text-muted-foreground mb-2">Request</p>
                  <p className="text-sm text-foreground break-all">{selectedInsight.request || 'N/A'}</p>
                </div>

                <div className="rounded-lg border border-border p-3 min-w-0">
                  <p className="text-xs text-muted-foreground mb-2">Raw Event</p>
                  <pre className="whitespace-pre-wrap break-all text-xs text-foreground/90 overflow-x-hidden">{selectedInsight.raw || 'N/A'}</pre>
                </div>

                <div className="rounded-lg border border-border p-3 min-w-0">
                  <p className="text-xs text-muted-foreground mb-2">Full Stored Description</p>
                  <pre className="whitespace-pre-wrap break-all text-xs text-foreground/80 overflow-x-hidden">{selectedAlert.description}</pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
