import { EventPattern } from '@nestjs/microservices';

/**
 * Nest 12's `EventPattern` types the handler as a single-parameter method.
 * This keeps the pre-upgrade multi-parameter handler signatures compiling
 * without changing the decorator's runtime behavior.
 * 
 * @deprecated This decorator is created for passing multi-parameter handler signatures to Nest 12's `EventPattern`. Don't use this decorator in new code; use `EventPattern` directly with a single-parameter handler.
 */
export const LegacyEventPattern = EventPattern as (
    metadata?: unknown,
    transportOrExtras?: unknown,
    maybeExtras?: Record<string, unknown>,
) => MethodDecorator;
