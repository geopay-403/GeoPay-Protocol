# 🌍 GeoPaySwitch

> Smart payment routing agent for multi-region PSP optimization via Layer-403

[![npm version](https://badge.fury.io/js/geopay-switch.svg)](https://www.npmjs.com/package/geopay-switch)
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
