# n8n-nodes-ai-orchestrator

Deterministic multi-provider AI node for n8n with routing, schema guarantees, retries/fallback, caching, and structured metrics.

## V1 scope

- One node with two modes:
  - `Task` (default, production path)
  - `Chat / Agent-lite` (memory only during node execution)
- Providers:
  - OpenAI (`/chat/completions`)
  - Anthropic (`/messages`)
  - Gemini (`generateContent`)
- Routing inputs:
  - `taskType`
  - `priority` (`cost|latency|quality`)
  - `budgetUsdMax`
  - `latencyMsMax`
  - `minQualityTier`
- JSON reliability loop:
  - Attempt 1: chosen model
  - Attempt 2: same model with repair prompt + validation errors
  - Attempt 3: fallback model
  - Failure -> dead-letter output
- Cache backends:
  - memory (LRU)
  - Redis
  - Postgres
  - SQLite
- Log sinks:
  - stdout
  - webhook
  - PostHog
  - Postgres

## Install

```bash
npm install
npm run build
```

Pack/publish as a normal n8n community node package (`n8n-nodes-ai-orchestrator`).

## Credentials

Create `AI Orchestrator API` credential and provide any subset of:

- `OpenAI API Key`
- `Anthropic API Key`
- `Gemini API Key`

Base URLs are configurable for proxy/self-hosted gateways.

## Node outputs

- Output 0 (`main`): valid result payload
- Output 1 (`error`): dead-letter payload with trace, input, errors, and raw output

## Task mode contract

Inputs:

- `taskType`
- `instructions`
- `context` (JSON)
- `data` (JSON)
- `outputSchema` (optional JSON Schema)

Output JSON includes:

- `result`
- `raw`
- `usage` (`inputTokens`, `outputTokens`, `costUsd`, `latencyMs`)
- `modelChosen`
- `retries`
- `cacheHit`
- `traceId`

## Notes

- Tool calling and streaming are intentionally not in V1.
- Routing model catalog and costs are in `/src/lib/providerCatalog.ts` for easy tuning.
