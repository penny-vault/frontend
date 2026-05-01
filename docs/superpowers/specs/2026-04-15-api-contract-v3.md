# Penny Vault API 3.0 — Spec

**Date:** 2026-04-15
**API version:** 3.0.0
**Status:** Draft, locked-in decisions
**Companion file:** `api/openapi.yaml`

## Why

Frontend and backend are being rewritten in parallel. The OpenAPI document is the contract both teams build against — typed TypeScript clients on one side, generated Go handlers (or hand-written, same contract) on the other. A mock server (MSW) driven by this spec lets the frontend ship Phase 1 without waiting on the backend.

## Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Format | OpenAPI 3.1 (YAML) |
| 2 | Base path | `/v3` (breaking rewrite; can coexist with legacy `/v1`) |
| 3 | URL path casing | lowercase with `kebab-case` for multi-word segments (e.g. `/trailing-returns`) |
| 4 | JSON body casing | `camelCase` — idiomatic on the TS side; Go backend adds explicit `json:` struct tags |
| 5 | Auth | Bearer JWT from Auth0, referenced globally as `BearerAuth` |
| 6 | Error shape | RFC 7807 Problem Details (`application/problem+json`) |
| 7 | Date/time | ISO 8601 strings in JSON; client parses to `Date` |

## Scope — v3 first cut

Only what the **Portfolio Summary** screen consumes. We grow the spec one endpoint at a time as we port each page.

- `GET /v3/portfolios` — list user's portfolios (light metadata)
- `GET /v3/portfolios/{id}` — full portfolio detail (summary, drawdowns, metrics, trailing returns, allocation)
- `GET /v3/portfolios/{id}/measurements` — time-series portfolio + benchmark values

## Consumers

- **Frontend** (`frontend-ng/`): uses `openapi-typescript` to codegen types; uses `ofetch` + TanStack Query for fetching; uses MSW with handlers that implement this spec for dev/test.
- **Backend** (pv-api rewrite, separate project): handlers implement the same paths and schemas. Conformance verified via integration tests that load this YAML and assert response shapes.

## Change control

Additive changes land on `/v3` without notice. **Breaking changes** require a new path prefix (`/v4`). All changes go through this YAML file first, then the frontend handlers + types regenerate from it.

## Out of scope for v3

- Authentication endpoints (handled by Auth0, not our API)
- User profile endpoints (identity comes from the Auth0 ID token)
- Strategy authoring endpoints (later phase)
- Trading/order-execution endpoints (later phase)
