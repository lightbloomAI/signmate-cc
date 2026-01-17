import { NextResponse } from 'next/server';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    speech: ServiceStatus;
    translation: ServiceStatus;
    websocket: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}

const startTime = Date.now();

export async function GET() {
  const uptime = Date.now() - startTime;

  // Check service health (mock for now, would connect to actual services)
  const services: HealthStatus['services'] = {
    speech: { status: 'healthy', latency: 45 },
    translation: { status: 'healthy', latency: 120 },
    websocket: { status: 'healthy', latency: 5 },
  };

  const statuses = [services.speech.status, services.translation.status, services.websocket.status];
  const overallStatus: HealthStatus['status'] = statuses.every(s => s === 'healthy')
    ? 'healthy'
    : statuses.some(s => s === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

  const health: HealthStatus = {
    status: overallStatus,
    version: '1.0.0',
    uptime,
    timestamp: new Date().toISOString(),
    services,
  };

  return NextResponse.json(health, {
    status: overallStatus === 'healthy' ? 200 : 503,
  });
}
