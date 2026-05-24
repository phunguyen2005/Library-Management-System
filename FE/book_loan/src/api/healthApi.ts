import { apiRequest } from './client';

export type HealthCheckStatus = 'ok' | 'warn' | 'fail';

export interface HealthCheck {
  status: HealthCheckStatus;
  message: string;
  free_percent?: number | null;
  usage_mb?: number;
  limit_mb?: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  checked_at: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    queue: HealthCheck;
    storage: HealthCheck;
    memory: HealthCheck;
  };
}

export async function fetchHealthStatus() {
  return apiRequest<HealthStatus>('/health', { auth: false });
}
