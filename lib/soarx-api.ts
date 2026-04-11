export interface PredictRequest {
  data: Record<string, number | string | boolean | null>;
}

export interface PredictResponse {
  prediction: 'RISK' | 'NORMAL';
  confidence: number;
}

export interface PredictAndStoreRequest {
  data: Record<string, number | string | boolean | null>;
  source: string;
  target_ip?: string;
  title?: string;
  description?: string;
  timestamp?: string;
}

export interface PredictAndStoreResponse {
  prediction: 'RISK' | 'NORMAL';
  confidence: number;
  alert: Record<string, unknown> | null;
}

type RawPrediction = 'ATTACK' | 'BENIGN';

function normalizePrediction(raw: RawPrediction): PredictResponse['prediction'] {
  return raw === 'ATTACK' ? 'RISK' : 'NORMAL';
}

export interface HealthResponse {
  status: string;
}

export interface ServerLogImportItem {
  message: string;
  timestamp?: string;
  level?: string;
  source?: string;
  target_ip?: string;
  risk_score?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'open' | 'investigating' | 'resolved';
  title?: string;
  description?: string;
}

export interface ImportServerLogsRequest {
  source?: string;
  logs: ServerLogImportItem[];
}

export interface ImportServerLogsResponse {
  imported: number;
  data: Record<string, unknown>[];
  audit_log_error?: string | null;
}

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export async function predictThreat(payload: PredictRequest): Promise<PredictResponse> {
  const response = await fetch(`${getApiBaseUrl()}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Prediction request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { prediction?: string; confidence?: number };

  if (
    !data ||
    (data.prediction !== 'ATTACK' && data.prediction !== 'BENIGN') ||
    typeof data.confidence !== 'number'
  ) {
    throw new Error('Unexpected prediction response format');
  }

  return {
    prediction: normalizePrediction(data.prediction as RawPrediction),
    confidence: data.confidence,
  };
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  const data = (await response.json()) as HealthResponse;
  if (!data || typeof data.status !== 'string') {
    throw new Error('Unexpected health response format');
  }

  return data;
}

export async function predictAndStoreThreat(
  payload: PredictAndStoreRequest
): Promise<PredictAndStoreResponse> {
  const response = await fetch(`${getApiBaseUrl()}/predict-and-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Predict-and-store request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    prediction?: string;
    confidence?: number;
    alert?: Record<string, unknown> | null;
  };

  if (
    !data ||
    (data.prediction !== 'ATTACK' && data.prediction !== 'BENIGN') ||
    typeof data.confidence !== 'number'
  ) {
    throw new Error('Unexpected predict-and-store response format');
  }

  return {
    prediction: normalizePrediction(data.prediction as RawPrediction),
    confidence: data.confidence,
    alert: data.alert ?? null,
  };
}

export async function importServerLogs(
  payload: ImportServerLogsRequest
): Promise<ImportServerLogsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/import-server-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Import request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    imported?: number;
    data?: Record<string, unknown>[];
    audit_log_error?: string | null;
  };

  if (!data || typeof data.imported !== 'number' || !Array.isArray(data.data)) {
    throw new Error('Unexpected import-server-logs response format');
  }

  return {
    imported: data.imported,
    data: data.data,
    audit_log_error: data.audit_log_error ?? null,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function predictThreatWithRetry(
  payload: PredictRequest,
  retries = 2,
  retryDelayMs = 500
): Promise<PredictResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await predictThreat(payload);
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Prediction request failed after retries');
}
