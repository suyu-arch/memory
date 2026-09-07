import 'reflect-metadata';
import { shutdownTelemetry } from './instrumentation.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

declare global {
  interface BigInt { toJSON(): string; }
}

BigInt.prototype.toJSON = function toJSON() { return this.toString(); };

async function bootstrap() {
  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const app = await NestFactory.create(AppModule, {
    cors: { origin: allowedOrigins, credentials: false },
  });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  process.once('SIGTERM', () => void shutdownTelemetry());
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
