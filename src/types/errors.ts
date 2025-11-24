/**
 * Error types and error handling
 */

export type GeoPayErrorCode =
  // Routing errors
  | "REGION_NOT_ALLOWED"
  | "REGION_NOT_FOUND"
  | "NO_AVAILABLE_REGIONS"
  | "REGION_LIMIT_EXCEEDED"
  | "METHOD_NOT_SUPPORTED"
  
  // Payment errors
  | "PAYMENT_DECLINED"
  | "INSUFFICIENT_FUNDS"
  | "CARD_EXPIRED"
  | "INVALID_CARD"
  | "FRAUD_DETECTED"
  | "AUTHENTICATION_REQUIRED"
  | "AUTHENTICATION_FAILED"
  
  // Network/System errors
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  
  // Validation errors
  | "INVALID_INTENT"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_AMOUNT"
  | "INVALID_CURRENCY"
  | "INVALID_TOKEN"
  
  // Compliance errors
  | "SANCTIONS_BLOCKED"
  | "KYC_REQUIRED"
  | "COMPLIANCE_REJECTED"
  
  // Layer-403 errors
  | "LAYER403_ERROR"
  | "INVALID_SIGNATURE"
  | "AUTHENTICATION_ERROR"
  
  // Generic
  | "UNKNOWN_ERROR";

export interface GeoPayError {
  /** Error code for programmatic handling */
  code: GeoPayErrorCode;
  /** Human-readable error message */
  message: string;
  /** Whether this error can be retried/fallback */
  isRetryable: boolean;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Original error if wrapped */
  cause?: Error;
  /** Timestamp of error */
  timestamp: string;
  /** Request ID for debugging */
  requestId?: string;
}

/**
 * Map of retryable error codes
 */
const RETRYABLE_CODES: Set<GeoPayErrorCode> = new Set([
  "TIMEOUT",
  "NETWORK_ERROR",
  "SERVICE_UNAVAILABLE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "LAYER403_ERROR",
]);

/**
 * Custom error class for GeoPay errors
 */
export class GeoPayException extends Error {
  readonly code: GeoPayErrorCode;
  readonly isRetryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly requestId?: string;

  constructor(error: GeoPayError) {
    super(error.message);
    this.name = "GeoPayException";
    this.code = error.code;
    this.isRetryable = error.isRetryable;
    this.details = error.details;
    this.timestamp = error.timestamp;
    this.requestId = error.requestId;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeoPayException);
    }
  }

  toJSON(): GeoPayError {
    return {
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

/**
 * Create a GeoPayError object
 */
export function createError(
  code: GeoPayErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): GeoPayError {
  return {
    code,
    message,
    isRetryable: RETRYABLE_CODES.has(code),
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Wrap unknown error into GeoPayError
 */
export function wrapError(error: unknown, requestId?: string): GeoPayError {
  if (error instanceof GeoPayException) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      return createError("TIMEOUT", error.message, undefined, requestId);
    }
    
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
      return createError("NETWORK_ERROR", error.message, undefined, requestId);
    }

    return createError("UNKNOWN_ERROR", error.message, { stack: error.stack }, requestId);
  }

  return createError("UNKNOWN_ERROR", String(error), undefined, requestId);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: GeoPayError | GeoPayException): boolean {
  if (error instanceof GeoPayException) {
    return error.isRetryable;
  }
  return error.isRetryable;
}

/**
 * Map HTTP status to error code
 */
export function httpStatusToErrorCode(status: number): GeoPayErrorCode {
  switch (status) {
    case 400:
      return "INVALID_INTENT";
    case 401:
      return "AUTHENTICATION_ERROR";
    case 403:
      return "REGION_NOT_ALLOWED";
    case 404:
      return "REGION_NOT_FOUND";
    case 408:
      return "TIMEOUT";
    case 429:
      return "RATE_LIMITED";
    case 500:
    case 502:
    case 503:
    case 504:
      return "SERVICE_UNAVAILABLE";
    default:
      return "UNKNOWN_ERROR";
  }
}
