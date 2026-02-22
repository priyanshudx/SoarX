export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  timestamp: string;
  source: string;
  targetIP: string;
}

export interface MetricCard {
  title: string;
  value: string | number;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

export interface FeatureImportance {
  name: string;
  value: number;
  percentage: number;
}

export interface RecommendedAction {
  id: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}
