'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, BrainCircuit, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { FeatureImportance, RecommendedAction } from './types';
import type { Alert } from './types';

interface ExplainableAIPanelProps {
  loading?: boolean;
  riskScore?: number;
  alerts?: Alert[];
  showPerEventExplanations?: boolean;
}

interface PerEventExplanationsSectionProps {
  loading?: boolean;
  alerts?: Alert[];
  className?: string;
}

interface AlertInsight {
  id: string;
  title: string;
  source: string;
  severity: Alert['severity'];
  timestamp: string;
  riskScore: number;
  request: string | null;
  predictionLabel: string | null;
  confidence: number | null;
  modelRisk: number | null;
  heuristicRisk: number | null;
  finalRisk: number;
  indicators: string[];
  raw: string | null;
  hasMetadata: boolean;
}

type ExplainabilityMetadata = {
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

const fallbackFeatureData: FeatureImportance[] = [
  { name: 'HTTP 5xx Errors', value: 80, percentage: 30 },
  { name: 'Suspicious Query Patterns', value: 74, percentage: 26 },
  { name: 'Repeated Source IP', value: 66, percentage: 22 },
  { name: 'Auth Endpoint Activity', value: 58, percentage: 18 },
  { name: 'Payload Size Anomalies', value: 42, percentage: 12 },
];

const fallbackActions: RecommendedAction[] = [
  {
    id: '1',
    action: 'Block suspicious source IP and review ingress logs',
    priority: 'high',
    reason: 'Potential exploit attempts were detected in imported server logs',
  },
  {
    id: '2',
    action: 'Enable strict WAF rule set for auth endpoints',
    priority: 'high',
    reason: 'Repeated malicious request patterns targeting login endpoints',
  },
  {
    id: '3',
    action: 'Correlate incidents with IAM and audit trail',
    priority: 'medium',
    reason: 'Cross-system validation helps confirm blast radius and impact',
  },
];

const EXPLANATION_EVENTS_PER_PAGE = 15;

function extractJsonObjectAfterPrefix(content: string, prefix: string): string | null {
  const prefixIndex = content.indexOf(prefix);
  if (prefixIndex === -1) {
    return null;
  }

  const jsonStart = content.indexOf('{', prefixIndex + prefix.length);
  if (jsonStart === -1) {
    return null;
  }

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

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(jsonStart, i + 1);
      }
    }
  }

  return null;
}

function parseMetaJson(description: string): ExplainabilityMetadata | null {
  const jsonBlock = extractJsonObjectAfterPrefix(description, 'meta_json=');
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock) as ExplainabilityMetadata;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function extractLegacyPart(description: string, key: string): string {
  const regex = new RegExp(`${key}=([^|]+)`, 'i');
  const match = description.match(regex);
  return match ? match[1].trim() : '';
}

function parseIndicatorsFromLegacy(description: string): string[] {
  const value = extractLegacyPart(description, 'indicators').toLowerCase();
  if (!value || value === 'none') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumeric(raw: string): number | null {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFriendlyIndicatorName(indicator: string): string {
  return indicator
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function shortAlertTitle(title: string, maxLength = 36): string {
  if (title.length <= maxLength) {
    return title;
  }

  return `${title.slice(0, maxLength - 3)}...`;
}

function toAlertInsight(alert: Alert): AlertInsight {
  const meta = parseMetaJson(alert.description);

  const legacyConfidence = parseNumeric(extractLegacyPart(alert.description, 'confidence'));
  const legacyModelRisk = parseNumeric(extractLegacyPart(alert.description, 'model_risk'));
  const legacyHeuristicRisk = parseNumeric(extractLegacyPart(alert.description, 'heuristic_risk'));
  const legacyFinalRisk = parseNumeric(extractLegacyPart(alert.description, 'final_risk'));
  const legacyRequest = extractLegacyPart(alert.description, 'request') || null;
  const legacyRaw = extractLegacyPart(alert.description, 'raw') || null;
  const legacyAi = extractLegacyPart(alert.description, 'AI') || null;
  const legacyIndicators = parseIndicatorsFromLegacy(alert.description);

  const metaConfidence = typeof meta?.confidence === 'number' ? meta.confidence : null;
  const metaModelRisk = typeof meta?.model_risk === 'number' ? meta.model_risk : null;
  const metaHeuristicRisk = typeof meta?.heuristic_risk === 'number' ? meta.heuristic_risk : null;
  const metaFinalRisk = typeof meta?.final_risk === 'number' ? meta.final_risk : null;
  const metaIndicators = Array.isArray(meta?.indicators)
    ? meta?.indicators.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];

  return {
    id: alert.id,
    title: alert.title,
    source: alert.source,
    severity: alert.severity,
    timestamp: alert.timestamp,
    riskScore: alert.riskScore,
    request: meta?.request || legacyRequest,
    predictionLabel: meta?.prediction_label || legacyAi,
    confidence: metaConfidence ?? legacyConfidence,
    modelRisk: metaModelRisk ?? legacyModelRisk,
    heuristicRisk: metaHeuristicRisk ?? legacyHeuristicRisk,
    finalRisk: metaFinalRisk ?? legacyFinalRisk ?? alert.riskScore,
    indicators: metaIndicators.length > 0 ? metaIndicators : legacyIndicators,
    raw: meta?.raw || legacyRaw,
    hasMetadata: Boolean(meta?.schema),
  };
}

function buildFeatureDataFromAlerts(alerts: AlertInsight[]): FeatureImportance[] {
  const counts = new Map<string, number>();

  for (const alert of alerts) {
    for (const indicator of alert.indicators) {
      counts.set(indicator, (counts.get(indicator) || 0) + 1);
    }
  }

  if (counts.size === 0) {
    return fallbackFeatureData;
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0) || 1;

  return sorted.map(([indicator, count]) => ({
    name: toFriendlyIndicatorName(indicator),
    value: Math.min(100, Math.round((count / total) * 100)),
    percentage: Math.round((count / total) * 100),
  }));
}

function buildActionsFromInsights(insights: AlertInsight[]): RecommendedAction[] {
  const top = insights
    .slice()
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  if (top.length === 0) {
    return fallbackActions;
  }

  return top.map((alert, index) => ({
    id: String(index + 1),
    action:
      alert.riskScore >= 85
        ? `Contain source ${alert.source} and apply emergency controls`
        : alert.riskScore >= 60
          ? `Run targeted review for ${alert.source} traffic and auth traces`
          : `Continue monitoring ${alert.source} and validate baseline`,
    priority: alert.riskScore >= 85 ? 'high' : alert.riskScore >= 60 ? 'medium' : 'low',
    reason: `${alert.title} (risk ${Math.round(alert.riskScore)})`,
  }));
}

function buildScoreBreakdown(insights: AlertInsight[]) {
  const withAiScores = insights.filter((alert) => alert.modelRisk !== null && alert.heuristicRisk !== null);
  if (withAiScores.length === 0) {
    return null;
  }

  const avgModelRisk = withAiScores.reduce((sum, alert) => sum + (alert.modelRisk ?? 0), 0) / withAiScores.length;
  const avgHeuristicRisk = withAiScores.reduce((sum, alert) => sum + (alert.heuristicRisk ?? 0), 0) / withAiScores.length;
  const avgFinalRisk = withAiScores.reduce((sum, alert) => sum + alert.finalRisk, 0) / withAiScores.length;

  return {
    count: withAiScores.length,
    avgModelRisk,
    avgHeuristicRisk,
    avgFinalRisk,
  };
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-900/20 text-red-400 border-red-800';
    case 'medium':
      return 'bg-amber-900/20 text-amber-400 border-amber-800';
    case 'low':
      return 'bg-green-900/20 text-green-400 border-green-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high':
      return <AlertCircle size={16} />;
    case 'medium':
      return <Zap size={16} />;
    case 'low':
      return <CheckCircle2 size={16} />;
    default:
      return null;
  }
}

function getSeverityPillClass(severity: Alert['severity']): string {
  if (severity === 'critical') return 'bg-red-900/30 text-red-300 border-red-700';
  if (severity === 'high') return 'bg-orange-900/30 text-orange-300 border-orange-700';
  if (severity === 'medium') return 'bg-amber-900/30 text-amber-300 border-amber-700';
  return 'bg-green-900/30 text-green-300 border-green-700';
}

function getConfidencePercent(confidence: number | null): number | null {
  if (confidence === null || Number.isNaN(confidence)) {
    return null;
  }

  if (confidence <= 1) {
    return confidence * 100;
  }

  return Math.min(confidence, 100);
}

export function PerEventExplanationsSection({ loading, alerts = [], className }: PerEventExplanationsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const insights = useMemo(
    () => alerts.map(toAlertInsight).sort((a, b) => b.riskScore - a.riskScore),
    [alerts]
  );

  const totalEvents = insights.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / EXPLANATION_EVENTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [totalEvents]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedInsights = useMemo(() => {
    const start = (currentPage - 1) * EXPLANATION_EVENTS_PER_PAGE;
    return insights.slice(start, start + EXPLANATION_EVENTS_PER_PAGE);
  }, [currentPage, insights]);

  const showingStart = totalEvents === 0 ? 0 : (currentPage - 1) * EXPLANATION_EVENTS_PER_PAGE + 1;
  const showingEnd = totalEvents === 0 ? 0 : Math.min(currentPage * EXPLANATION_EVENTS_PER_PAGE, totalEvents);

  return (
    <div className={className ?? ''}>
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Per-Event Explanations</h3>
            <p className="text-sm text-muted-foreground">Structured AI evidence for recent high-risk events</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
            Showing {showingStart}-{showingEnd} of {totalEvents} events
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full bg-muted" />
            ))}
          </div>
        ) : pagedInsights.length === 0 ? (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            No imported log explanations are available yet. Import server logs to populate this section.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {pagedInsights.map((insight) => {
              const confidencePercent = getConfidencePercent(insight.confidence);
              return (
                <article key={insight.id} className="rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground" title={insight.title}>{shortAlertTitle(insight.title)}</p>
                      <p className="text-xs text-muted-foreground">{insight.source} · {formatTimestamp(insight.timestamp)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${getSeverityPillClass(insight.severity)}`}>
                      {insight.severity}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                      Final Risk {insight.finalRisk.toFixed(1)}
                    </span>
                    {confidencePercent !== null && (
                      <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                        Confidence {confidencePercent.toFixed(1)}%
                      </span>
                    )}
                    {insight.predictionLabel && (
                      <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                        Label {insight.predictionLabel}
                      </span>
                    )}
                    <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                      {insight.hasMetadata ? 'Structured metadata' : 'Legacy parsed metadata'}
                    </span>
                  </div>

                  {insight.request && (
                    <p className="mb-2 text-xs text-foreground/90">
                      <span className="font-medium">Request:</span> {insight.request}
                    </p>
                  )}

                  {insight.indicators.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {insight.indicators.map((indicator) => (
                        <span key={`${insight.id}-${indicator}`} className="rounded-full border border-cyan-800 bg-cyan-900/20 px-2 py-0.5 text-[11px] text-cyan-300">
                          {toFriendlyIndicatorName(indicator)}
                        </span>
                      ))}
                    </div>
                  )}

                  {insight.raw && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">Raw: {insight.raw}</p>
                  )}
                </article>
              );
            })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ExplainableAIPanel({ loading, riskScore = 82, alerts = [], showPerEventExplanations = true }: ExplainableAIPanelProps) {
  const insights = alerts.map(toAlertInsight);
  const featureData = buildFeatureDataFromAlerts(insights);
  const recommendedActions = buildActionsFromInsights(insights);
  const scoreBreakdown = buildScoreBreakdown(insights);

  const metadataCoverageCount = insights.filter((alert) => alert.hasMetadata).length;
  const metadataCoveragePct = insights.length === 0 ? 0 : (metadataCoverageCount / insights.length) * 100;
  const confidenceValues = insights
    .map((item) => getConfidencePercent(item.confidence))
    .filter((value): value is number => value !== null);
  const avgConfidence = confidenceValues.length === 0
    ? null
    : confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <BrainCircuit size={16} /> Metadata Coverage
          </div>
          {loading ? <Skeleton className="h-8 w-20 bg-muted" /> : <p className="text-2xl font-bold text-foreground">{metadataCoveragePct.toFixed(0)}%</p>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert size={16} /> AI-labeled Risk
          </div>
          {loading ? <Skeleton className="h-8 w-20 bg-muted" /> : <p className="text-2xl font-bold text-foreground">{insights.filter((item) => item.predictionLabel === 'RISK').length}</p>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Zap size={16} /> Avg Confidence
          </div>
          {loading ? <Skeleton className="h-8 w-20 bg-muted" /> : <p className="text-2xl font-bold text-foreground">{avgConfidence === null ? 'N/A' : `${avgConfidence.toFixed(1)}%`}</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Indicator Distribution</h3>
        <p className="text-sm text-muted-foreground mb-4">Top extracted attack indicators across recent alerts</p>

        {loading ? (
          <Skeleton className="h-64 w-full bg-muted" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#11182f',
                  border: '1px solid #24304f',
                  borderRadius: '8px',
                  color: '#dbe6ff',
                }}
                formatter={(value) => [`${value}%`, 'Relative share']}
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Overall Risk Assessment</h3>

        {loading ? (
          <Skeleton className="h-20 w-full bg-muted" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Risk Score</span>
              <span className="text-3xl font-bold text-destructive">{riskScore}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  riskScore >= 80
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : riskScore >= 60
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {riskScore >= 80
                ? 'Critical threat level - Immediate action required'
                : riskScore >= 60
                  ? 'High threat level - Prompt investigation recommended'
                  : 'Moderate threat level - Continued monitoring advised'}
            </p>

            {scoreBreakdown && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Score breakdown from {scoreBreakdown.count} alerts with AI risk fields</p>
                <p className="text-xs text-foreground">Raw model risk: {scoreBreakdown.avgModelRisk.toFixed(1)}%</p>
                <p className="text-xs text-foreground">Heuristic risk: {scoreBreakdown.avgHeuristicRisk.toFixed(1)}%</p>
                <p className="text-xs text-foreground">Final blended risk: {scoreBreakdown.avgFinalRisk.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showPerEventExplanations && <PerEventExplanationsSection loading={loading} alerts={alerts} />}

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">AI-Recommended Actions</h3>
        <p className="text-sm text-muted-foreground mb-4">Actionable playbook steps generated from top risk events</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {recommendedActions.map((action) => (
              <div
                key={action.id}
                className={`p-4 rounded-lg border ${getPriorityColor(action.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">{getPriorityIcon(action.priority)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{action.action}</p>
                    <p className="text-xs mt-1 opacity-75">{action.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}