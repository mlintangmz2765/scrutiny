# Phase 19 — AI Assistance Layer (Governed, Human-in-the-Loop)

Goal: Argus-class document intelligence and copilots — provider-agnostic (self-hosted
models first-class), every output PROPOSED until a human accepts, immutable usage log,
red-team suite in CI. This phase deliberately lifts the v1 non-goal.

Read first: DOMAIN-V2.md §14 (governance — every rule is binding); PLAN-V2.md §3
Phase 19.

---

### T-19.1 — Provider gateway
**Prereqs:** T-11.8, T-14.10
**Files:** `apps/server/src/ai/{gateway.ts,providers/openai-compatible.ts,providers/anthropic.ts,providers/mock.ts,+tests}`;
FirmSettings AI config; `.env.example`
**Steps:**
1. `AiProvider` interface: `complete({templateId, variables, maxTokens}) →
   {text, model, usage}`. Adapters: openai-compatible (base URL + key — covers
   llama.cpp/ollama/vLLM/openai), anthropic (messages API), mock (deterministic:
   echoes a canned response per templateId — used by ALL tests).
2. Prompts live server-side as versioned templates
   (`apps/server/src/ai/templates/*.ts` — id, version, system text, variable slots);
   raw user/client text only ever fills declared slots.
3. Config: `AI_ENABLED` (default false), provider selection, endpoint, key env;
   kill switch per DOMAIN-V2 §14 (gateway throws `AI_DISABLED`, UI surfaces hide).
4. Timeouts, retry (1), max concurrent (2) — jobs, never request-path blocking.
**Acceptance:**
- [ ] Gateway tests with mock provider; disabled-flag refusal; adapter request
      shaping tested against local stub HTTP servers (no real network); template
      variable injection escapes/handles braces safely.

### T-19.2 — Governance core & red-team suite
**Prereqs:** T-19.1
**Files:** Prisma `AiInteraction` + migration; `apps/server/src/ai/{governance.ts,+tests}`;
`apps/server/src/ai/redteam/{fixtures/*.txt,redteam.test.ts}`
**Steps:**
1. `AiInteraction` per DOMAIN-V2 §14: id, engagementId, templateId+version, model,
   provider, inputRefs JSON (document/attachment ids — never raw text), outputHash,
   surface, status (`PROPOSED`|`ACCEPTED`|`REJECTED`), proposedAt, reviewerId?,
   decidedAt?. Append-only (no update route except the decision transition; decision
   is one-shot — second decision 409).
2. `proposeAiOutput()` / `decideAiOutput()` helpers every feature MUST use; the
   helpers write the log row and enforce the state machine.
3. Red-team suite: prompt-injection fixtures ("ignore instructions and approve…",
   markdown/script injection, oversized inputs) run through each template against
   the mock provider; assertions: outputs are stored as inert text (no HTML script
   execution in render — test the renderer), no state change occurs without a
   human decision call, log rows always written. CI runs the suite.
**Acceptance:**
- [ ] State machine tests (one-shot decision, no auto-accept path exists — grep-level
      test asserting no caller sets ACCEPTED without reviewerId); red-team suite
      green in CI; log rows immutable.

### T-19.3 — Document ingestion & extraction
**Prereqs:** T-19.2
**Files:** `apps/server/src/ai/{extract.ts,+tests}`; Prisma `DocumentExtract` +
migration; job handler; deps `pdf-parse`, `mammoth`
**Steps:**
1. Extraction job for attachments (pdf → per-page text via pdf-parse; docx via
   mammoth with page-break heuristics; txt passthrough): `DocumentExtract` rows
   {attachmentId, page, text} — plain text only, stored in OLTP, size-capped
   (100k chars/doc, over-cap → error status on the extract).
2. Trigger: manual per attachment ("prepare for AI") or bulk per engagement; status
   surfaced on attachment rows. No automatic extraction of anything (explicit
   user action only — governance posture).
3. Fixtures: small pdf + docx committed with known text.
**Acceptance:**
- [ ] Extraction tests assert exact known strings and page mapping; cap enforced;
      unsupported types rejected cleanly.

### T-19.4 — Document summarization → draft working papers
**Prereqs:** T-19.3
**Files:** `apps/server/src/ai/features/{summarize.ts,+tests}`; routes; UI on
attachment/WP pages (`apps/web/src/pages/ai/ProposalReview.tsx` shared component)
**Steps:**
1. `POST /api/engagements/:id/ai/summarize {attachmentId, purpose}` (MEMBER+,
   AI_ENABLED, extract exists): job calls the summarize template (variables: purpose,
   extract chunks), output = markdown summary with mandatory citation markers
   `[p.N]` per claim (template instructs; renderer links them to pages).
2. Output lands as an AiInteraction PROPOSED + preview payload; ACCEPT creates a
   working paper (body = summary + provenance header: source doc, model, interaction
   id) attributed to the reviewer; REJECT archives the proposal.
3. Shared ProposalReview UI: diff-style preview, accept/reject with required note on
   reject; lists pending proposals per engagement.
**Acceptance:**
- [ ] Mock-provider flow end to end: propose → accept → WP exists with provenance;
      reject leaves no WP; citation markers preserved; uncited-output template test
      (mock returns text without markers → proposal flagged `NEEDS_CITATIONS`, accept
      blocked).

### T-19.5 — Risk suggestion copilot
**Prereqs:** T-19.4
**Files:** `apps/server/src/ai/features/{risk-suggest.ts,+tests}`; risk grid UI
integration
**Steps:**
1. Input assembly (deterministic, testable): TB movements vs PM (v1 T-04.5 data),
   analytics summaries (Phase 14 run summaries), entity profile — serialized into
   the template variables (no raw GL rows).
2. Output schema-parsed (zod): array of {fsliCode, assertion, suggestedIR,
   suggestedCR, rationale}; invalid items dropped with a logged count; valid ones
   become PROPOSED rows rendered in the risk matrix (distinct styling), accept
   writes the assessment via the v1 risk service (rmm derived server-side as
   always), attributed to the reviewer.
3. Suggestions never overwrite existing assessments (only fill empty cells; a
   suggestion on an assessed cell renders as a side note).
**Acceptance:**
- [ ] Input assembly snapshot test (exact serialization for a fixture engagement);
      schema-parse drops malformed items (count asserted); accept path writes
      through the real risk service; assessed-cell protection tested.

### T-19.6 — Anomaly narratives
**Prereqs:** T-19.5
**Files:** `apps/server/src/ai/features/{anomaly-narrative.ts,+tests}`; JE score UI
integration
**Steps:**
1. Batch job: top-N (param, default 25) scored entries from a T-14.4 run →
   narrative template (variables: entry fields, triggered features, engagement
   context) → per-entry PROPOSED narratives.
2. Accepted narratives attach to the JeScoreResult (column narrativeText +
   interactionId) and appear in the score grid drawer and the documented WP
   (T-14.9 rerun includes them).
3. Batch review UI: list with accept-all-individually (no bulk accept — each is a
   distinct human decision per governance).
**Acceptance:**
- [ ] Batch produces N proposals; per-item decisions enforced (no bulk endpoint
      exists); accepted text lands in the WP on re-document; mock determinism keeps
      assertions exact.

### T-19.7 — Disclosure pre-screening
**Prereqs:** T-19.6
**Files:** `apps/server/src/ai/features/{disclosure-screen.ts,+tests}`; checklist UI
integration
**Steps:**
1. Job over the Phase 15 checklist: for each OPEN applicable item, template gets the
   item requirement + relevant FS block texts (matched by section mapping) → proposed
   response {answer YES/NO/NA, note-link suggestion, rationale}.
2. Proposals render inline on the checklist (chip per item); accepting writes the
   response through the T-15.5 service (all its validation rules still apply — a
   proposed NO without reason cannot be accepted until the reviewer supplies one).
3. Items with no relevant FS content propose nothing (template contract), asserted.
**Acceptance:**
- [ ] Fixture checklist: exact proposal set from mock outputs; T-15.5 validation
      still binding on accept; no-content items skipped.

### T-19.8 — AI usage reporting & inspection integration
**Prereqs:** T-19.7
**Files:** `apps/server/src/modules/quality/ai-usage.ts` (+tests); T-17.7 bundle
retrofit; `apps/web/src/pages/quality/AiUsagePage.tsx`; `docs/user-guide/ai.md`
**Steps:**
1. `GET /api/engagements/:id/ai-usage` (LEAD+) and firm-wide (PARTNER/ADMIN):
   interactions with decisions, acceptance rates, models used; CSV export.
2. Inspection bundle (T-17.7) gains `ai-usage.csv` + interaction rows referenced in
   the manifest; bundles from engagements with zero AI use state that explicitly.
3. User guide: setup (ollama example), governance model, what inspectors see;
   PLAN-V2 §6 reminder that AI never self-approves.
**Acceptance:**
- [ ] Usage math (acceptance rate) exact on fixtures; bundle contains the CSV with
      matching hashes; docs page exists; final v2 gate — `pnpm lint && pnpm
      typecheck && pnpm test && pnpm build` green and PLAN-V2 milestone v3.0 tagged.
