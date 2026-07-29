# 0028 — Observe auth through redacted stable outcomes

Status: accepted
Date: 2026-07-29
Topic: observability

## Context

The pack forwards message-oriented MSAL data, but v5 messages are not stable product
errors and authentication events can contain tokens/accounts. Full URLs and browser traces
can also leak sensitive state.

## Decision

Use a vendor-neutral typed event port and W3C trace context to owned APIs. Emit only
allowlisted application/resource/route-template outcomes, codes and timings. Drop raw
MSAL messages/payloads, full URLs and all identity/authentication material. Telemetry is
non-blocking and not an audit/authorization source.

## Why

Operations can detect bridge, continuation, renewal, claims, logout and release failures
without creating a second sensitive identity store or coupling to an experimental SDK.

## Rejected

- Forward raw MSAL logs/errors/events.
- Full URLs or payloads in spans.
- Browser telemetry as security audit.
- Auth dependency on exporter availability.
- Mandatory experimental browser OTel SDK.

## Evidence

- [MSAL performance events](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/performance).
- [W3C Trace Context](https://www.w3.org/TR/trace-context/).
- [OpenTelemetry URL data guidance](https://opentelemetry.io/docs/specs/semconv/url/).

## Consequences

Vendor, retention, region, sampling and SLO thresholds require security/privacy/operations
approval. Redaction tests are release gates.
