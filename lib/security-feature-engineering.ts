import type { Alert } from '@/components/soar-x/types';
import type { PredictRequest } from '@/lib/soarx-api';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildPredictRequestFromAlerts(alerts: Alert[]): PredictRequest {
  const totalAlerts24h = alerts.length;

  const highRiskAlerts = alerts.filter((alert) => alert.riskScore >= 80).length;

  const failedLoginSignals = alerts.reduce((count, alert) => {
    const content = `${alert.title} ${alert.description}`.toLowerCase();
    return content.includes('login') && content.includes('failed') ? count + 1 : count;
  }, 0);

  const unusualTrafficSignals = alerts.reduce((count, alert) => {
    const content = `${alert.title} ${alert.description}`.toLowerCase();
    return content.includes('traffic') || content.includes('lateral movement') ? count + 1 : count;
  }, 0);

  const portScanningSignals = alerts.reduce((count, alert) => {
    const content = `${alert.title} ${alert.description}`.toLowerCase();
    return content.includes('port') || content.includes('scan') ? count + 1 : count;
  }, 0);

  const privilegeEscalationAttempts = alerts.reduce((count, alert) => {
    const content = `${alert.title} ${alert.description}`.toLowerCase();
    return content.includes('privilege escalation') ? count + 1 : count;
  }, 0);

  const dataTransferVolumeMb = alerts.reduce((sum, alert) => {
    const severityMultiplier =
      alert.severity === 'critical' ? 120 : alert.severity === 'high' ? 90 : alert.severity === 'medium' ? 55 : 25;

    const riskWeight = clamp(alert.riskScore / 100, 0.1, 1);
    return sum + Math.round(severityMultiplier * riskWeight);
  }, 0);

  return {
    data: {
      failed_logins: failedLoginSignals,
      unusual_traffic: unusualTrafficSignals,
      port_scanning: portScanningSignals,
      privilege_escalation_attempts: privilegeEscalationAttempts,
      data_transfer_volume_mb: dataTransferVolumeMb,
      high_risk_alerts: highRiskAlerts,
      total_alerts_24h: totalAlerts24h,
    },
  };
}
