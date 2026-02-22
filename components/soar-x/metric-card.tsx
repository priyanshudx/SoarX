'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: 'blue' | 'cyan' | 'green' | 'amber' | 'red';
}

const colorVariants = {
  blue: 'from-blue-500 to-blue-600',
  cyan: 'from-cyan-500 to-cyan-600',
  green: 'from-green-500 to-green-600',
  amber: 'from-amber-500 to-amber-600',
  red: 'from-red-500 to-red-600',
};

export function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
  loading,
  icon,
  color = 'blue',
}: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && (
          <div className={`w-10 h-10 bg-gradient-to-br ${colorVariants[color]} rounded-lg flex items-center justify-center text-white`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <Skeleton className="h-10 w-32 mb-4 bg-muted" />
      ) : (
        <div className="mb-4">
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
      )}

      {/* Description & Trend */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              trend === 'up'
                ? 'text-green-500'
                : trend === 'down'
                  ? 'text-red-500'
                  : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' && <TrendingUp size={14} />}
            {trend === 'down' && <TrendingDown size={14} />}
            {trend === 'stable' && <Minus size={14} />}
            {trendValue && `${trendValue}%`}
          </div>
        )}
      </div>
    </div>
  );
}
