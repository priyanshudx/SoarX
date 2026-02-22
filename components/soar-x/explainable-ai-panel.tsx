'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { FeatureImportance, RecommendedAction } from './types';

const featureData: FeatureImportance[] = [
  { name: 'Failed Logins', value: 95, percentage: 28 },
  { name: 'Unusual Traffic', value: 87, percentage: 25 },
  { name: 'Port Scanning', value: 76, percentage: 22 },
  { name: 'Privilege Escalation', value: 68, percentage: 20 },
  { name: 'Data Transfer Volume', value: 45, percentage: 13 },
];

const recommendedActions: RecommendedAction[] = [
  {
    id: '1',
    action: 'Isolate affected host from network immediately',
    priority: 'high',
    reason: 'Critical malware signature detected',
  },
  {
    id: '2',
    action: 'Reset credentials for compromised user account',
    priority: 'high',
    reason: 'Multiple privilege escalation attempts detected',
  },
  {
    id: '3',
    action: 'Review and revoke suspicious API tokens',
    priority: 'medium',
    reason: 'Unusual authentication patterns identified',
  },
];

interface ExplainableAIPanelProps {
  loading?: boolean;
  riskScore?: number;
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

export function ExplainableAIPanel({ loading, riskScore = 82 }: ExplainableAIPanelProps) {
  return (
    <div className="space-y-6">
      {/* Feature Importance Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Feature Importance Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">AI Model Explainability - Key factors contributing to risk assessment</p>

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
                  backgroundColor: '#141b3a',
                  border: '1px solid #1e2749',
                  borderRadius: '8px',
                  color: '#e8eef7',
                }}
                formatter={(value) => [value, 'Importance Score']}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Risk Score Progress */}
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
          </div>
        )}
      </div>

      {/* Recommended Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">AI-Recommended Actions</h3>
        <p className="text-sm text-muted-foreground mb-4">Actionable insights based on explainable AI analysis</p>

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
