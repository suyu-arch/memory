import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
import { Sentry } from '../instrumentation.js';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(catchError((error: unknown) => {
      const status = typeof error === 'object' && error && 'getStatus' in error
        ? Number((error as { getStatus(): number }).getStatus())
        : 500;
      if (status >= 500) {
        const request = context.switchToHttp().getRequest<{ route?: { path?: string }; method?: string }>();
        Sentry.withScope((scope) => {
          scope.setTag('http.method', request.method ?? 'UNKNOWN');
          scope.setTag('http.route', request.route?.path ?? 'unknown');
          Sentry.captureException(error);
        });
      }
      return throwError(() => error);
    }));
  }
}
