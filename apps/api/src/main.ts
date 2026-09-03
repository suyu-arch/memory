import 'reflect-metadata';
import { shutdownTelemetry } from './instrumentation.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

declare global {
  interface BigInt { toJSON(): string; }
}

BigInt.prototype.toJSON = function toJSON() { return this.toString(); };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  process.once('SIGTERM', () => void shutdownTelemetry());
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
