'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, TrendingUp, Brain, Zap, RefreshCw, Server, CircleAlert } from 'lucide-react';
import { Sidebar } from '@/components/soar-x/sidebar';
import { Header } from '@/components/soar-x/header';
import { MetricCard } from '@/components/soar-x/metric-card';
import { AlertsTable } from '@/components/soar-x/alerts-table';
import { PerEventExplanationsSection } from '@/components/soar-x/explainable-ai-panel';
import { Badge } from '@/components/ui/badge';
import { checkBackendHealth, predictThreatWithRetry } from '@/lib/soarx-api';
import { buildPredictRequestFromAlerts } from '@/lib/security-feature-engineering';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/context/auth-context';

function extractMetricFromDescription(description: string, key: string): number | null {
  const match = description.match(new RegExp(`${key}=([0-9]+(?:\\.[0-9]+)?)`, 'i'));
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [modelConfidence, setModelConfidence] = useState('94.2%');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiError, setApiError] = useState('');
  const [predictionLoading, setPredictionLoading] = useState(true);
  const { alerts, isLoading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useAlerts(1000, user?.email);

  const totalAlerts = alerts.length;
  const highRiskAlerts = alerts.filter((alert) => alert.riskScore >= 80).length;
  const aiEnrichedAlerts = alerts.filter(
    (alert) =>
      extractMetricFromDescription(alert.description, 'model_risk') !== null &&
      extractMetricFromDescription(alert.description, 'heuristic_risk') !== null
  );

  const avgModelConfidence = aiEnrichedAlerts.length
    ? aiEnrichedAlerts.reduce((sum, alert) => {
        const score = extractMetricFromDescription(alert.description, 'model_risk') ?? 0;
        return sum + score;
      }, 0) / aiEnrichedAlerts.length
    : null;

  const averageRiskScore = totalAlerts
    ? (alerts.reduce((sum, alert) => sum + alert.riskScore, 0) / totalAlerts).toFixed(1)
    : '0.0';

  const modelConfidenceDisplay = avgModelConfidence !== null ? `${avgModelConfidence.toFixed(1)}%` : modelConfidence;
  const metricsLoading = alertsLoading || predictionLoading;
  const alertsSectionLoading = alertsLoading;

  const loadDashboardData = useCallback(async () => {
    setPredictionLoading(true);
    setApiError('');
    setBackendStatus('checking');

    try {
      await checkBackendHealth();
      setBackendStatus('online');

      const payload = buildPredictRequestFromAlerts(alerts);
      const prediction = await predictThreatWithRetry(payload, 2, 600);

      const confidencePercent = Math.max(0, Math.min(100, Math.round(prediction.confidence * 100)));
      setModelConfidence(`${confidencePercent}%`);
    } catch (error) {
      setBackendStatus('offline');
      setApiError(error instanceof Error ? error.message : 'Failed to reach backend prediction service.');
      console.error('Failed to fetch prediction from backend:', error);
    } finally {
      setPredictionLoading(false);
    }
  }, [alerts]);

  // Load prediction from backend and handle hydration.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!alertsLoading) {
      if (alerts.length === 0) {
        setPredictionLoading(false);
        return;
      }
      loadDashboardData();
    }
  }, [alertsLoading, alerts.length, loadDashboardData]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <Header />

      {/* Main Content */}
      <main className="pt-20 lg:ml-64 pb-8">
        <div className="p-6 lg:p-8 space-y-8">
          {/* Header Section */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Security Dashboard</h1>
            <p className="text-muted-foreground">Real-time threat monitoring with Explainable AI insights</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={backendStatus === 'online' ? 'default' : backendStatus === 'checking' ? 'secondary' : 'destructive'}>
                <Server size={12} />
                Backend {backendStatus}
              </Badge>
            </div>
            {(apiError || alertsError) && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <CircleAlert size={16} className="mt-0.5 flex-shrink-0" />
                <p>{alertsError || apiError}</p>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isMounted && (
              <>
                <MetricCard
                  title="Total Alerts"
                  value={metricsLoading ? '---' : totalAlerts}
                  description="Last 24 hours"
                  trend="up"
                  trendValue={12}
                  loading={metricsLoading}
                  icon={<AlertTriangle size={20} />}
                  color="blue"
                />
                <MetricCard
                  title="High Risk Alerts"
                  value={metricsLoading ? '---' : highRiskAlerts}
                  description="Require attention"
                  trend="down"
                  trendValue={8}
                  loading={metricsLoading}
                  icon={<Zap size={20} />}
                  color="red"
                />
                <MetricCard
                  title="Average Risk Score"
                  value={metricsLoading ? '---' : averageRiskScore}
                  description="Final blended risk (AI + heuristic)"
                  trend="stable"
                  loading={metricsLoading}
                  icon={<TrendingUp size={20} />}
                  color="amber"
                />
                <MetricCard
                  title="Raw Model Confidence"
                  value={metricsLoading ? '---' : modelConfidenceDisplay}
                  description="Model-only probability before heuristics"
                  trend="stable"
                  loading={metricsLoading}
                  icon={<Brain size={20} />}
                  color="cyan"
                />
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8">
            {isMounted && (
              <>
                {/* Alerts Section */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">Recent Alerts</h2>
                    <p className="text-sm text-muted-foreground">Sortable and filterable security alerts</p>
                  </div>
                  <AlertsTable loading={alertsSectionLoading} alerts={alerts} />

                  <div className="mt-6">
                    <h2 className="text-xl font-bold text-foreground">Per-Event Explanations</h2>
                    <p className="text-sm text-muted-foreground">Human-readable reasoning for each high-risk event</p>
                  </div>
                  <PerEventExplanationsSection loading={alertsSectionLoading} alerts={alerts} className="mt-4" />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
