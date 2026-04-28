# Astra — Langfuse Integration: Implementation Gaps

Analysis of the current Langfuse trace integration in `@astra/core`, from an AI developer perspective.
Identified during code review of `core/src/telemetry/`, `core/src/lib/agent.ts`, and `core/src/evaluators/`.

---

## Gap 1 — The biggest assumption: target must use astra's trace ID

**What the code does:**
`agent.ts` mints an OTel trace ID and injects it into the outgoing HTTP request as `X-Langfuse-Trace-Id`. After the response, it fetches `GET /api/public/traces/{traceId}` to retrieve the target's internal trace.

**The gap:**
This only works if the target application reads that header and uses it as the Langfuse trace ID when logging its own trace. Most Langfuse SDKs auto-generate their own IDs. The developer must explicitly override it — this is non-trivial in some SDKs.

**Questions to resolve:**
- Does the documentation show exactly how to read `X-Langfuse-Trace-Id` and override the trace ID in the Langfuse JS SDK, Python SDK, and via OpenTelemetry?
- What happens in `astra run` when the trace is not found after all retries — does the judge still run on the response alone, or does the attack get marked as errored?
- Should there be a `astra verify-propagation` step that sends a test request and confirms a trace appears in Langfuse before running all attacks?

---

## Gap 2 — Curator LLM only sees metadata stubs, not full traces

**What the code does:**
In `langfuseTraceCuration.ts`, the curator LLM receives the raw list page from `GET /api/public/traces` — a JSON array of trace metadata stubs. It picks the most relevant IDs. Full observations (spans, generations, tool calls) are only fetched *after* the curator has already chosen.

**The gap:**
The list API may not include input/output content or observation data depending on the `fields` parameter. If only IDs and timestamps are returned, the curator is choosing blindly — it cannot see which traces involved tool calls, errors, or sensitive operations.

**Questions to resolve:**
- What fields does `GET /api/public/traces` actually return without a `fields` param — are inputs/outputs included?
- If the list is sparse, should a small pre-sample of full traces be hydrated first and sent to the curator instead?
- Is the current `traceCurationListJsonMaxChars: 28000` limit large enough to include meaningful trace content for a list of 100 traces?

---

## Gap 3 — No trace filtering before curation (all agents mixed together)

**What the code does:**
`fetchLangfuseTracesListPage` calls `GET /api/public/traces` with only `page` and `limit` parameters. There is no filtering by trace name, tags, environment, or userId in the actual HTTP request (these fields exist in `LangfuseTraceSelectionConfig` but are not wired into `buildTraceListParams`).

**The gap:**
If a Langfuse project contains multiple agents (e.g. a booking bot and a support bot), the curator receives all traces mixed together. It must guess which are relevant to the specific target being tested.

**Questions to resolve:**
- `LangfuseTraceSelectionConfig` defines `tags`, `environment`, `sessionId`, `fromTimestamp` — are these actually passed as query params to the Langfuse API? (Currently `buildTraceListParams` only sets `page` and `limit`.)
- Should filtering by trace `name` be supported as a first-class field?
- Is using a separate Langfuse project per agent the intended deployment model?

---

## Gap 4 — Judge enrichment adds significant latency with unclear accuracy gain

**What the code does:**
When `enrichJudgeFromTrace: true`, each attack waits `initialDelayMs` then polls up to `maxAttempts` times with `retryDelayMs` between each. With defaults: 500ms + (5 × 400ms) = **2,500ms extra per attack**. For 20 attacks that's 50 seconds of added wait time purely for Langfuse polling.

**The gap:**
There is no measurement of whether judge accuracy actually improves with the trace JSON vs without it. For a simple chatbot with no tool calls, the trace JSON is largely empty and adds noise rather than signal.

**Questions to resolve:**
- Has there been any evaluation of judge verdict quality with vs without Langfuse trace context?
- Should `enrichJudgeFromTrace` auto-disable itself when observations come back empty?
- Should trace fetching happen concurrently with the next attack request (pipeline) rather than blocking sequentially?
- What does the judge actually do differently when it sees tool call spans vs when it only sees the HTTP response text?

---

## Gap 5 — Same trace-summary.md is used for all evaluators regardless of relevance

**What the code does:**
`runLangfuseSetupTraceCuration` produces one `trace-summary.md`. That same markdown is passed as `traceContext` to `generateAttackPrompts` for every evaluator — whether generating prompt injection attacks or excessive agency attacks.

**The gap:**
A trace showing a refund flow is highly relevant for excessive-agency attacks but mostly irrelevant for prompt injection attacks. Passing the same context to all evaluators may cause some attack prompts to be contaminated with irrelevant domain details, reducing their targeting precision.

**Questions to resolve:**
- Should the summarizer produce evaluator-specific sections (e.g. "Attack angles for excessive-agency", "Attack angles for sensitive-disclosure")?
- Should attack generation filter the summary per evaluator type rather than passing the full document?
- Is there a risk of the trace context making attack prompts less generic and therefore missing vulnerability classes that don't appear in the observed traces?

---

## Gap 6 — No confirmation that astra's attack trace is the one being fetched

**What the code does:**
After each attack, astra fetches `GET /api/public/traces/{traceId}` using the propagated trace ID. If the target used that ID, the right trace is returned. There is no additional verification.

**The gap:**
In a high-traffic production or staging environment, there is no way to confirm the fetched trace was actually caused by astra's attack (vs concurrent real user traffic that happened to use the same trace ID — unlikely but possible). More practically: if the target ignores the header and generates its own trace ID, astra silently fetches a non-existent trace, gets a 404, and falls back to judging without trace context — with no warning to the user.

**Questions to resolve:**
- Should the attack response or body include an `X-Astra-Run-Id` marker that the target forwards into trace metadata, so astra can verify it is reading the correct trace?
- Should astra log a visible warning when `enrichJudgeFromTrace` is true but the trace fetch returns 404 after all retries, so developers know their propagation isn't working?
- Should there be a dry-run mode that sends one test request and verifies trace retrieval before running the full attack suite?

---

## Summary

| Gap | Severity | Status |
|-----|----------|--------|
| Target must manually use astra's trace ID | High | Open |
| Curator sees metadata stubs, not full traces | Medium | Open |
| Trace filters not wired to Langfuse API params | Medium | Open |
| Judge enrichment latency vs accuracy tradeoff | Medium | Open |
| Same trace summary used across all evaluators | Low | Open |
| No verification that fetched trace is from astra attack | Low | Open |
