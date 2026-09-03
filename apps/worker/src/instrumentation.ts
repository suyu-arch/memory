import * as Sentry from '@sentry/node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

if (process.env.SENTRY_DSN) Sentry.init({
  dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, sendDefaultPii: false,
});

const telemetry = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces` }),
  instrumentations: [getNodeAutoInstrumentations()],
}) : null;
telemetry?.start();

export { Sentry };
export async function shutdownTelemetry() { await telemetry?.shutdown(); }
