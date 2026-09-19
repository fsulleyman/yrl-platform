/**
 * YRL Application Error Taxonomy & Safe Serialization
 *
 * Prevents internal database details, stack traces, and system exceptions
 * from leaking to client components while providing actionable diagnostics server-side.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly isOperational: boolean;
  public readonly severity: ErrorSeverity;

  constructor(
    userMessage: string,
    code = 'APP_ERROR',
    isOperational = true,
    severity: ErrorSeverity = 'error'
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.isOperational = isOperational;
    this.severity = severity;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(userMessage: string, fieldErrors?: Record<string, string[]>) {
    super(userMessage, 'VALIDATION_ERROR', true, 'warning');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(userMessage = 'Unauthorized: administrator session required.') {
    super(userMessage, 'UNAUTHORIZED', true, 'warning');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(userMessage = 'Access denied: insufficient permissions for this operation.') {
    super(userMessage, 'FORBIDDEN', true, 'warning');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Too many requests. Please wait ${retryAfterSeconds} seconds before trying again.`,
      'RATE_LIMITED',
      true,
      'warning'
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotFoundError extends AppError {
  constructor(userMessage = 'The requested resource was not found.') {
    super(userMessage, 'NOT_FOUND', true, 'info');
    this.name = 'NotFoundError';
  }
}

/**
 * Sanitizes any caught error into a safe client-facing message.
 * Internal server/database errors are logged server-side and replaced with safe generic messages.
 */
export function sanitizeError(
  err: unknown,
  defaultMessage = 'An unexpected error occurred. Please try again.'
): string {
  if (err instanceof AppError && err.isOperational) {
    return err.userMessage;
  }

  // Log full internal error server-side for diagnostics
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Internal Error Diagnostic]:', message);

  // Check for known safe database error patterns (e.g. duplicate key)
  if (typeof message === 'string') {
    if (
      message.includes('23505') ||
      message.includes('unique constraint') ||
      message.includes('duplicate key')
    ) {
      return 'A record with this information already exists in the system.';
    }
  }

  return defaultMessage;
}
