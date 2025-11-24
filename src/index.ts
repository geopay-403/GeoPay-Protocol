/**
 * GeoPaySwitch - Smart Payment Routing via Layer-403
 * 
 * @packageDocumentation
 */

// Main client
export { GeoPaySwitch, createClient } from "./client.js";

// Types
export * from "./types/index.js";

// Routing utilities
export {
  filterQuotes,
  isRegionAllowed,
  getFilterReasonDescription,
  type FilterResult,
  type FilteredQuote,
  type FilterReason,
} from "./routing/filter.js";

export {
  scoreQuotes,
  customScore,
  explainScore,
  type ScoringResult,
  type ScoringMeta,
} from "./routing/scorer.js";

export {
  applyStrategy,
  makeRouteDecision,
  getNextFallback,
  createCustomStrategy,
  combineStrategies,
  type StrategyFn,
} from "./routing/strategy.js";

// Layer-403 client (for advanced usage)
export {
  Layer403Client,
  createLayer403Client,
  type Layer403Response,
  type QuoteRequest,
  type PayRequest,
  type RefundRequest,
} from "./layer403/client.js";

export {
  RequestSigner,
  generateIdempotencyKey,
  generateRequestId,
  type SignedRequest,
  type SignatureParams,
} from "./layer403/signer.js";

// Cache
export {
  Cache,
  createQuoteCacheKey,
  createRegionsCacheKey,
  type CacheEntry,
  type CacheOptions,
  type CacheStats,
} from "./cache/index.js";

// Utilities
export {
  Logger,
  Timer,
  withTiming,
  defaultLogger,
} from "./utils/logger.js";

export {
  CURRENCIES,
  getCurrencyInfo,
  toSmallestUnit,
  fromSmallestUnit,
  formatAmount,
  calculateFxFee,
  isValidCurrency,
  getRegionCurrency,
  type CurrencyInfo,
} from "./utils/currency.js";

// Express middleware
export {
  createGeoPayMiddleware,
  createWebhookVerificationMiddleware,
  createErrorMiddleware,
  type GeoPayMiddlewareOptions,
} from "./middleware/express.js";

// Version
export const VERSION = "1.0.0";
