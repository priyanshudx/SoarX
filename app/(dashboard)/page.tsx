'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Brain, Zap } from 'lucide-react';
import { Sidebar } from '@/components/soar-x/sidebar';
import { Header } from '@/components/soar-x/header';
import { MetricCard } from '@/components/soar-x/metric-card';
import { AlertsTable } from '@/components/soar-x/alerts-table';
import { ExplainableAIPanel } from '@/components/soar-x/explainable-ai-panel';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Simulate data loading and handle hydration
  useEffect(() => {
    setIsMounted(true);
    // Load data immediately without artificial delay
    setLoading(false);
  }, []);

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
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isMounted && (
              <>
                <MetricCard
                  title="Total Alerts"
                  value={loading ? '---' : 1234}
                  description="Last 24 hours"
                  trend="up"
                  trendValue={12}
                  loading={loading}
                  icon={<AlertTriangle size={20} />}
                  color="blue"
                />
                <MetricCard
                  title="High Risk Alerts"
                  value={loading ? '---' : 47}
                  description="Require attention"
                  trend="down"
                  trendValue={8}
                  loading={loading}
                  icon={<Zap size={20} />}
                  color="red"
                />
                <MetricCard
                  title="Average Risk Score"
                  value={loading ? '---' : '68.5'}
                  description="Overall threat level"
                  trend="stable"
                  loading={loading}
                  icon={<TrendingUp size={20} />}
                  color="amber"
                />
                <MetricCard
                  title="Model Confidence"
                  value={loading ? '---' : '94.2%'}
                  description="AI prediction accuracy"
                  trend="up"
                  trendValue={3}
                  loading={loading}
                  icon={<Brain size={20} />}
                  color="cyan"
                />
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {isMounted && (
              <>
                {/* Alerts Section */}
                <div className="xl:col-span-2">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">Recent Alerts</h2>
                    <p className="text-sm text-muted-foreground">Sortable and filterable security alerts</p>
                  </div>
                  <AlertsTable loading={loading} />
                </div>

                {/* Explainable AI Panel */}
                <div className="xl:col-span-1">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">AI Insights</h2>
                    <p className="text-sm text-muted-foreground">Explainable AI analysis</p>
                  </div>
                  <ExplainableAIPanel loading={loading} riskScore={82} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
