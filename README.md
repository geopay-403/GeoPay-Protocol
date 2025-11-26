# 🌍 GeoPaySwitch

> Smart payment routing agent for multi-region PSP optimization via Layer-403

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## Overview

GeoPaySwitch is a TypeScript/Node.js library that intelligently routes payments through regional payment processors to minimize fees and maximize success rates. It acts as an agent between your application and multiple PSPs/acquirers via a unified Layer-403 gateway.

### Key Features

- 🎯 **Smart Routing** - Automatically selects the best region based on fees, success rate, and latency
- 💰 **Cost Optimization** - Reduces payment processing fees by routing to cheaper regions
- 🔄 **Automatic Fallback** - Retries failed payments through alternative regions
- 🔒 **PCI Compliant** - Never handles raw card data, only tokens
- 📊 **Observability** - Built-in logging, metrics, and event hooks
- ⚡ **Caching** - Intelligent quote caching for faster responses
- 🛡️ **Compliance** - Configurable region restrictions and sanctions checking

## Installation

```bash
npm install geopay-switch
```

```bash
yarn add geopay-switch
```

```bash
pnpm add geopay-switch
```

## Quick Start

```typescript
import { GeoPaySwitch } from "geopay-switch";

// Initialize client
const client = new GeoPaySwitch({
  layer403: {
    baseUrl: "https://403-gateway.example.com",
    apiKey: process.env.GEOPAY_API_KEY!,
    apiSecret: process.env.GEOPAY_API_SECRET!,
  },
  routing: {
    mode: "auto",
    allowedRegions: ["EU", "UK", "SG", "US"],
    weights: { price: 0.7, success: 0.25, latency: 0.05 },
    fallback: { enabled: true, maxTries: 3 },
  },
});

// Execute payment with auto-routing
const result = await client.pay({
  id: "order_123",
  amount: 99.99,
  currency: "USD",
  paymentMethod: "card",
  cardToken: "tok_visa_4242",
  userCountry: "DE",
});

console.log(`Payment ${result.status} via ${result.regionUsed}`);
```

## API Reference

### Initialization

```typescript
const client = new GeoPaySwitch({
  layer403: {
    baseUrl: string,           // Layer-403 gateway URL
    apiKey: string,            // API key
    apiSecret: string,         // API secret for signing
    timeoutMs?: number,        // Request timeout (default: 8000)
  },
  routing: {
    mode: "auto" | "pinned" | "dry-run",
    pinnedRegion?: string,     // Fixed region when mode is 'pinned'
    allowedRegions?: string[], // Whitelist of regions
    blockedRegions?: string[], // Blacklist of regions
    weights?: {
      price: number,           // Weight for cost (0-1)
      success: number,         // Weight for success rate (0-1)
      latency: number,         // Weight for latency (0-1)
    },
    strategy?: "cheapest" | "highest_success" | "balanced" | "custom",
    fallback?: {
      enabled: boolean,
      maxTries: number,
      backoffMs?: number,
    },
  },
  cache?: {
    ttlMs: number,             // Cache TTL in ms (default: 60000)
    maxEntries?: number,
  },
  compliance?: {
    enforceAllowedRegions?: boolean,
    sanctionsCheck?: boolean,
    kycRequired?: boolean,
  },
  observability?: {
    logLevel?: "error" | "warn" | "info" | "debug",
    onEvent?: (event) => void,
  },
});
```

### Methods

#### `quote(intent, options?)`

Get pricing quotes from all available regions without executing payment.

```typescript
const quotes = await client.quote({
  id: "order_123",
  amount: 100,
  currency: "USD",
  paymentMethod: "card",
  cardToken: "tok_xxx",
});

console.log(`Best option: ${quotes.best.region} - $${quotes.best.totalCost}`);
```

#### `decideRoute(intent, options?)`

Get the routing decision without executing payment.

```typescript
const decision = await client.decideRoute(intent);
console.log(`Would route to: ${decision.chosenRegion}`);
console.log(`Reason: ${decision.reasonSummary}`);
```

#### `pay(intent, options?)`

Execute payment with automatic routing and fallback.

```typescript
const result = await client.pay(intent, {
  idempotencyKey: "idem_order_123",
  noFallback: false,
});

if (result.status === "succeeded") {
  console.log(`Charged ${result.amountCharged} ${result.currencyCharged}`);
}
```

#### `refund(refundIntent, options?)`

Process a refund.

```typescript
const refund = await client.refund({
  paymentIntentId: "order_123",
  providerPaymentId: "pi_xxx",
  amount: 50.00,  // Partial refund
  reason: "requested_by_customer",
});
```

#### `listRegions()`

Get list of available regions.

```typescript
const regions = await client.listRegions();
regions.forEach(r => {
  console.log(`${r.code}: ${r.name} - ${r.methods.join(", ")}`);
});
```

#### `verifyWebhook(payload, signature, timestamp)`

Verify webhook signature from Layer-403.

```typescript
const isValid = client.verifyWebhook(
  rawBody,
  req.headers["x-geopay-signature"],
  req.headers["x-geopay-timestamp"]
);
```

## Payment Intent

```typescript
interface PaymentIntent {
  id: string;                    // Your order/payment ID
  amount: number;                // Amount to charge
  currency: string;              // ISO 4217 currency code
  paymentMethod: "card" | "bank_transfer" | "wallet" | "sepa" | "ach";
  cardToken?: string;            // Tokenized card (PCI-safe)
  userCountry?: string;          // User's country for routing
  userIp?: string;               // User's IP for risk/geo
  merchantCountry?: string;      // Your business country
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;            // For 3DS redirects
  webhookUrl?: string;           // Async notifications
}
```

## Routing Strategies

### Cheapest
Always selects the region with lowest total cost.
```typescript
routing: { strategy: "cheapest" }
```

### Highest Success
Prioritizes regions with best historical success rates.
```typescript
routing: { strategy: "highest_success" }
```

### Balanced (Default)
Uses weighted scoring across price, success, and latency.
```typescript
routing: {
  strategy: "balanced",
  weights: { price: 0.7, success: 0.25, latency: 0.05 }
}
```

### Custom
Provide your own scoring function.
```typescript
import { createCustomStrategy } from "geopay-switch";

routing: {
  strategy: "custom",
  customScorer: (quotes, weights) => {
    // Your custom logic
    return quotes.sort((a, b) => /* ... */);
  }
}
```

## Error Handling

```typescript
import { GeoPayException } from "geopay-switch";

try {
  const result = await client.pay(intent);
} catch (error) {
  if (error instanceof GeoPayException) {
    console.error(`Error: ${error.code} - ${error.message}`);
    console.error(`Retryable: ${error.isRetryable}`);
    
    switch (error.code) {
      case "PAYMENT_DECLINED":
        // Handle declined card
        break;
      case "INSUFFICIENT_FUNDS":
        // Handle insufficient funds
        break;
      case "NO_AVAILABLE_REGIONS":
        // No routes available
        break;
      case "TIMEOUT":
        // Can retry
        break;
    }
  }
}
```

### Error Codes

| Code | Retryable | Description |
|------|-----------|-------------|
| `PAYMENT_DECLINED` | No | Card was declined |
| `INSUFFICIENT_FUNDS` | No | Not enough balance |
| `FRAUD_DETECTED` | No | Flagged as fraudulent |
| `REGION_NOT_ALLOWED` | No | Region restricted |
| `NO_AVAILABLE_REGIONS` | No | No valid routes |
| `TIMEOUT` | Yes | Request timed out |
| `NETWORK_ERROR` | Yes | Connection failed |
| `SERVICE_UNAVAILABLE` | Yes | PSP temporarily down |
| `RATE_LIMITED` | Yes | Too many requests |

## Express Integration

```typescript
import express from "express";
import {
  GeoPaySwitch,
  createGeoPayMiddleware,
  createWebhookVerificationMiddleware,
  createErrorMiddleware,
} from "geopay-switch";

const app = express();
const geopay = new GeoPaySwitch({ /* config */ });

// Add idempotency key handling
app.use("/api/payments", createGeoPayMiddleware());

// Payment endpoint
app.post("/api/payments", async (req, res, next) => {
  try {
    const result = await geopay.pay(req.body, {
      idempotencyKey: req.geopay.idempotencyKey,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Webhook endpoint
app.post(
  "/webhooks/geopay",
  express.raw({ type: "application/json" }),
  createWebhookVerificationMiddleware(
    (payload, sig, ts) => geopay.verifyWebhook(payload, sig, ts)
  ),
  (req, res) => {
    const event = JSON.parse(req.body);
    // Handle webhook event
    res.json({ received: true });
  }
);

// Error handler
app.use(createErrorMiddleware());
```

## Observability

### Events

Subscribe to events for monitoring and metrics:

```typescript
const client = new GeoPaySwitch({
  // ...
  observability: {
    logLevel: "info",
    onEvent: (event) => {
      // Send to Datadog, Prometheus, etc.
      metrics.increment(`geopay.${event.type}`, {
        region: event.region,
        success: event.data.success,
      });
    },
  },
});
```

### Event Types

- `quote.started` - Quote request initiated
- `quote.completed` - Quotes received
- `route.chosen` - Routing decision made
- `payment.attempt` - Payment attempt started
- `payment.fallback` - Falling back to another region
- `payment.completed` - Payment finished
- `refund.started` - Refund initiated
- `refund.completed` - Refund finished

## FAQ

### Why might a region be unavailable?

- Amount below minimum or above maximum limit
- Payment method not supported
- Region in your blocklist
- Daily/monthly limits exceeded
- Compliance restrictions
- Region temporarily unavailable

### How does fallback work?

1. Payment attempted in best region
2. If it fails with a retryable error (timeout, 5xx):
   - Wait for backoff period
   - Try next best region
   - Repeat up to `maxTries`
3. If error is non-retryable (declined, fraud), stop immediately

### Is my card data safe?

Yes. GeoPaySwitch never handles raw card numbers. It only works with tokens from your card vault or payment provider.

---

## 🆕 New in v2.0.0

### Analytics & Metrics

Track payment performance, success rates, and regional statistics:

```typescript
import { createAnalytics } from "geopay-switch";

const analytics = createAnalytics({
  maxMetrics: 10000,
  onPersist: async (metrics) => {
    // Save to your database
  },
});

// Record payments
analytics.recordPayment({
  intentId: "pi_123",
  region: "eu-west",
  routerId: "stripe-eu",
  amount: 1000,
  currency: "USD",
  status: "succeeded",
  latencyMs: 450,
  timestamp: new Date().toISOString(),
  attempts: 1,
});

// Get insights
const snapshot = analytics.getSnapshot(24 * 60 * 60 * 1000); // Last 24h
console.log(`Success rate: ${snapshot.overallSuccessRate}%`);
console.log(`Best regions:`, analytics.getBestRegions(3));
```

### Fraud Detection

Built-in risk scoring and fraud prevention:

```typescript
import { createFraudDetector } from "geopay-switch";

const detector = createFraudDetector({
  thresholds: { review: 50, block: 80 },
  onHighRisk: (assessment, ctx) => {
    // Alert your team
  },
});

const assessment = await detector.assess({
  intent: paymentIntent,
  ip: "1.2.3.4",
  email: "customer@example.com",
  isNewCustomer: true,
  previousChargebacks: 0,
});

if (assessment.action === "block") {
  throw new Error("Transaction blocked");
}
```

### Subscriptions & Recurring Payments

Full subscription lifecycle management:

```typescript
import { createSubscriptionManager } from "geopay-switch";

const subscriptions = createSubscriptionManager(client, {
  maxRetryAttempts: 4,
  gracePeriodDays: 14,
});

// Register plans
subscriptions.registerPlan({
  id: "pro_monthly",
  name: "Pro Plan",
  amount: 2999,
  currency: "USD",
  interval: "monthly",
  trialDays: 14,
});

// Create subscription
const sub = await subscriptions.create("customer_123", "pro_monthly");

// Manage lifecycle
await subscriptions.pause(sub.id);
await subscriptions.resume(sub.id);
await subscriptions.changePlan(sub.id, "enterprise_monthly");
await subscriptions.cancel(sub.id, { reason: "Customer request" });
```

### Batch Processing

Process multiple payments efficiently:

```typescript
import { createBatch } from "geopay-switch";

const batch = createBatch()
  .addPayment(intent1)
  .addPayment(intent2, { priority: 1 })
  .addPayment(intent3, { forceRegion: "eu-west" })
  .concurrency(5)
  .retries(2)
  .onProgress((done, total) => console.log(`${done}/${total}`));

const result = await batch.execute(client);
console.log(`${result.succeeded}/${result.totalItems} succeeded`);
```

### Circuit Breaker

Prevent cascading failures:

```typescript
import { createCircuitBreaker } from "geopay-switch";

const breaker = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  onOpen: () => console.log("Circuit opened!"),
});

const result = await breaker.execute(async () => {
  return client.pay(intent);
});
```

### Rate Limiting

Protect against excessive API calls:

```typescript
import { createRateLimiter, RateLimitPresets } from "geopay-switch";

const limiter = createRateLimiter(RateLimitPresets.standard());

const check = limiter.consume({ identifier: req.ip });
if (!check.allowed) {
  throw new Error(`Rate limited. Retry after ${check.retryAfterMs}ms`);
}
```

### Health Checks

Monitor system health:

```typescript
import { createHealthMonitor, BuiltInChecks } from "geopay-switch";

const monitor = createHealthMonitor({ version: "2.0.0" });

monitor.register(BuiltInChecks.http("layer403", "https://api.layer403.com/health"));
monitor.register(BuiltInChecks.memory(90));

const health = await monitor.getHealth();
// { status: "healthy", checks: [...] }
```

### Event System

Subscribe to payment lifecycle events:

```typescript
import { createEventEmitter } from "geopay-switch";

const events = createEventEmitter();

events.on("payment:succeeded", (event) => {
  console.log(`Payment ${event.data.intentId} succeeded!`);
});

events.on("payment:failed", (event) => {
  // Handle failure
});
```

### Validators

Comprehensive input validation:

```typescript
import { createPaymentIntentValidator, CardValidators } from "geopay-switch";

const validator = createPaymentIntentValidator();
const result = validator.validate(paymentIntent);

if (!result.valid) {
  console.log(result.errors);
}

// Card validation
const isValid = CardValidators.luhn("4242424242424242");
const brand = CardValidators.getBrand("4242424242424242"); // "visa"
```

### Webhooks Management

Advanced webhook handling with retries:

```typescript
import { createWebhookManager } from "geopay-switch";

const webhooks = createWebhookManager({
  maxRetries: 5,
  onDeliveryFailure: (delivery) => {
    console.log(`Webhook failed: ${delivery.id}`);
  },
});

webhooks.registerEndpoint({
  url: "https://your-server.com/webhooks",
  secret: "whsec_...",
  events: ["payment.succeeded", "payment.failed"],
  active: true,
});

await webhooks.send(webhookPayload);
```

### Idempotency

Prevent duplicate payments:

```typescript
import { createIdempotencyManager } from "geopay-switch";

const idempotency = createIdempotencyManager({
  ttlMs: 24 * 60 * 60 * 1000,
});

const result = await idempotency.execute(
  "idempotency_key_123",
  paymentIntent,
  async () => client.pay(paymentIntent)
);
```

### Reporting & Reconciliation

Generate reports and reconcile payments:

```typescript
import { createReportingManager } from "geopay-switch";

const reporting = createReportingManager();

// Record payments
reporting.recordPayment(result, intent);

// Generate reports
const dailyReport = reporting.generateDailyReport("2024-01-15");
console.log(`Volume: $${dailyReport.volume.USD}`);

// Reconcile with external data
const reconciliation = reporting.reconcile("2024-01-15", externalRecords);
console.log(`Match rate: ${reconciliation.matchRate}%`);

// Export to CSV
const csv = reporting.exportToCSV("2024-01-01", "2024-01-31");
```

---

## License

MIT © Your Name

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Clone repo
git clone https://github.com/yourusername/geopay-switch.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```
