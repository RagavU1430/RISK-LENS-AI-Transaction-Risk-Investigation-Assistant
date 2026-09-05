TRACK_ID=PS06
# RiskLens AI

Transaction Risk Investigation Assistant — investigate transaction histories and build evidence-backed investigation reports.

## Current Phase

Final — Demo Ready (Phases 0–6 complete)

## What Exists

- FastAPI backend
- React frontend
- Premium dashboard shell
- Health endpoint
- Frontend served by Python
- Single-command application startup
- Synthetic transaction dataset (20 customers, 6 months)
- Customer behavioural baselines (descriptive statistics only)
- Data validation + data loader services
- Developer data-status endpoint
- Deterministic rule engine (R01–R05) with evidence + traceability
- Generated findings (`data/findings.json`) + finding validation
- Risk findings API
- Evidence engine: primary/related transactions, customer/payee/temporal context, baseline comparisons, calculation traces
- Generated evidence (`data/evidence.json`) + investigation contexts (`data/investigation_context.json`) + evidence validation
- Evidence/investigation APIs
- Gemini explanation layer (evidence-grounded only) + analysis cache + AI panel
- Investigation workspace: dashboard KPIs/charts, filterable investigations table, full detail workspace (rules, timeline, transactions, baseline, traceability, AI), transaction explorer, evidence explorer, printable reports

## Run

```bash
pip install -r requirements.txt
python app.py
```

Then open:

http://localhost:8000

Health check:

http://localhost:8000/api/v1/health

Frontend dev (optional):

```bash
cd frontend
npm install
npm run dev
```

Production build (served by FastAPI):

```bash
cd frontend
npm install
npm run build
```

## Environment

`GEMINI_API_KEY` enables Phase 4 investigation explanations. The deterministic pipeline (Phases 0–3) works without it.

```bash
cp .env.example .env   # then set GEMINI_API_KEY
```

`GEMINI_MODEL` (default `gemini-3.5-flash-lite`) and `GEMINI_TIMEOUT_SECONDS` (default 60) are configurable in one place (`backend/config.py`). The key lives only in local `.env` (gitignored) — never in code, JSON artifacts, or frontend JavaScript. The browser calls `/api/v1/...`; only the backend talks to Gemini.

Without a key the app keeps working: analysis endpoints return `{"status": "unavailable", ...}` and all deterministic data stays available. Nothing is fabricated.

### Gemini Investigation Layer (explanation only)

"Gemini does not determine risk. The deterministic investigation engine is the source of truth; Gemini provides an evidence-grounded explanation."

```
Transactions → Baselines → Deterministic Risk Rules → Findings
→ Evidence → Investigation Context → Gemini Explanation
```

- `backend/services/ai/gemini_client.py` — thin REST transport (httpx, no extra SDK), key/model from config, no secrets in logs
- `backend/services/ai/investigation_prompt.py` — strict evidence-only prompt (use supplied facts/calculations verbatim; "Insufficient evidence…" when missing; forbidden fraud verdicts)
- `backend/services/ai/response_parser.py` — fence-stripping, JSON parse, `InvestigationAIReport` validation; IDs stamped from context
- `backend/services/ai/grounding_validator.py` — rejects unknown transaction/finding/rule IDs and forbidden verdicts (`grounding_failed`, never silent)
- `backend/services/ai/investigation_ai.py` — orchestration + cache (`data/ai_analysis.json`, keyed by investigation_id + context hash; reuse unless `refresh`)
- Report: executive summary, what happened, why flagged, behavioral comparison, rule explanations, key evidence, analyst considerations, uncertainty, source references, model metadata — facts vs calculations vs interpretation kept separate

### Risk Engine (deterministic, no LLM)

- R01 Unusually Large Transaction: `amount > 5 × customer median` (strictly greater; exactly 5× does not trigger)
- R02 New Payee Burst: new payee (no prior history) with ≥3 txs within 15 min
- R03 Odd-Hours Activity: hour in [00, 05), with customer time-baseline evidence; severity reflects how unusual overnight is for that customer
- R04 Behavioural Deviation: `z = (amount − mean) / stddev`, `|z| ≥ 3` (MAD/median-ratio fallback when std is zero)
- R05 Transaction Burst: 30-min sliding window, `threshold = max(5, ceil(mean + 3·std))` (max+1 fallback)

The engine decides what happened; Gemini only explains already-detected findings. Rules are independent (one transaction can trigger several). Severity is LOW/MEDIUM/HIGH from deterministic thresholds only — no fraud probability, no “fraud confirmed” language. Every finding carries `finding_id`, `transaction_ids`, `evidence`, `baseline`, `calculation`, and `traceability: {source: data/transactions.csv}`.

### Run Risk Engine

```bash
python scripts/run_risk_engine.py
# python scripts/run_risk_engine.py --rule R01
```

Writes `data/findings.json` (`generated_from`, `engine_version`, `rules`, `findings`). Reruns are byte-identical (deterministic IDs `F0001…`, no random timestamps).

### API

- `GET /api/v1/risk/findings` with optional `?customer_id=C001&rule_id=R01&severity=HIGH`
- `GET /api/v1/customers/{customer_id}/findings`
- `GET /api/v1/evidence` with optional `?customer_id=&finding_id=F0001&rule_id=R01`
- `GET /api/v1/investigations/INV-F0001` — full context (customer, findings, primary/related transactions, baselines, calculations, evidence, traceability; deterministic only, no AI text)
- `GET /api/v1/customers/{customer_id}/investigation` — all findings + evidence for a customer (valid empty context when none)
- `GET /api/v1/investigations/INV-F0001/analysis` — AI explanation (`?refresh=true` regenerates); `POST` to the same path forces regeneration; also works for `INV-C001` customer investigations
- `GET /api/v1/investigations` — lightweight investigation summaries + `stats` (counts by rule/severity) with `?customer_id=&rule_id=&severity=&search=&limit=`
- `GET /api/v1/transactions` — paginated explorer (`?customer_id=&channel=&transaction_type=&payee=&search=&risk=all|flagged|normal&limit=&offset=&order=`) with per-row `triggered_rules`
- `GET /api/v1/transactions/{id}` — transaction detail with rule/finding/investigation references
- `GET /api/v1/customers` — customer list with finding counts
- `GET /api/v1/ai/status` — `{available, model, reason}` (never exposes the key)
- `GET /api/v1/evidence` now accepts `?summary=true` for lightweight explorer rows
- `POST /api/v1/chat` — assistant chatbot (`{message, history, investigation_id}`); grounded in site data via Gemini, same no-fraud/grounding contract as analysis; key never leaves the server
- `GET /api/v1/data/status`, `GET /api/v1/health` (unchanged)

### Frontend Workspace

Routes: `/` dashboard (KPIs, rule/severity/activity charts, recent investigations, pipeline) · `/investigations` (filterable table) · `/investigations/:investigationId` (header, risk summary, rule cards with exact backend values, evidence timeline, transaction cluster + detail modal, baseline chart, AI panel, traceability chain) · `/transactions` (paginated explorer with risk badges) · `/evidence` (filterable explorer) · `/reports` (printable report preview).

Demo flow: Dashboard → Investigations → select HIGH investigation → rules → transactions → baseline → AI explanation → source references → trace back to transaction. A floating assistant chat (bottom-right, every page) answers questions about the data, rules, and demo flow, and auto-grounds in the open investigation detail page. The UI labels deterministic output `[DETERMINISTIC]` vs `[AI ANALYSIS]`; review language only ("Rule Triggered", "Requires Investigation") — never fraud verdicts. Works with Gemini offline (AI panel shows unavailable; everything else intact).

### Evidence Engine (deterministic, no LLM)

The risk engine identifies findings; the evidence engine enriches them. Phase 2 remains authoritative — no thresholds are re-decided here.

- `backend/services/evidence_engine.py`: `build_evidence_for_finding()` + batched `build_all_evidence()` (single-pass indexes) + `build_investigation_contexts()` (`INV-{finding_id}` per finding)
- Each package: exact primary transactions (from `transactions.csv` only), related transactions (±24h, same customer, same-payee priority, max 20, primaries excluded), customer context (Phase 1 baseline only), payee context (chronological `known_before_finding`, first/last seen, counts), temporal context (hour, weekday, time distribution, nearby activity), baseline comparison mirroring the Phase 2 calculation, and full source traceability
- `backend/services/evidence_validation.py`: finding-exists, ID match, primary/related existence + customer ownership, no primary/related overlap, calculation match with Phase 2, traceability completeness, no fabricated IDs

```bash
python scripts/build_evidence.py
```

Writes `data/evidence.json` (`engine_version`, `generated_from: data/findings.json`, 766 packages) and `data/investigation_context.json` (766 `INV-Fxxxx` contexts). Reruns are byte-identical. Never modifies `findings.json`.

### Dataset

- 20 customers, ~8,966 transactions (target 8,000–12,000)
- Period: 2026-03-01 to 2026-08-31 (6 months)
- Synthetic, realistic operational-style data (date, description, payee, amount, channel)
- Deterministic seed: `SEED = 42` — same command produces the same dataset
- Behavioural variation: UPI-heavy, salary-driven, card-shopper, low-frequency, mixed archetypes
- Files (committed):
  - `data/transactions.csv`
  - `data/customers.csv`
  - `data/customer_baselines.json` (totals, avg/median/min/max/stdev, daily, channel/time/monthly summaries)
  - `data/payee_baselines.json` (per-customer payee counts, totals, first/last seen)
  - `data/dataset_metadata.json`

No risk scoring, fraud classification, RAG, embeddings, or FAISS exists. Gemini is used strictly as an evidence-grounded explanation layer (Phase 4); it never decides risk.

### Validation

`backend/services/data_validation.py` checks transaction_id uniqueness, customer references,
timestamp validity, numeric positive amounts, valid channels/types, required columns,
nulls, and chronological coverage. Returns `{valid, errors, warnings, rows}` and never
silently fixes data.

Developer endpoint: `GET /api/v1/data/status` → `{dataset_loaded, customers, transactions, date_range}`.

### Development Data Generation

Regenerate deterministically (not required for the judge):

```bash
python scripts/generate_data.py
# python scripts/generate_data.py --seed 42
```

Production `python app.py` loads committed CSV/JSON; it never regenerates on startup and
never requires `GEMINI_API_KEY`.

## Architecture

```
React/Vite frontend (frontend/dist)
        ↓  served as static files
FastAPI (app.py + backend/)
        ↓
transactions.csv → Data Loader → Baselines → RISK ENGINE (R01–R05) → findings.json
        ↓
EVIDENCE ENGINE → evidence.json + investigation_context.json
        ↓
Gemini explanation (reads investigation context only) → ai_analysis.json cache
```

Single entry point: `python app.py` starts Uvicorn on port 8000 and serves both the API (`/api/v1/*`) and the built frontend (`/`).

## Technology Stack

Backend: Python 3.11, FastAPI, Uvicorn, Pydantic, python-dotenv, httpx (Gemini REST transport — no extra AI SDK), pytest.
Frontend: React 18, Vite 5, Tailwind CSS, React Router, Lucide icons, Recharts.
Data: committed CSV/JSON artifacts (no database). AI: Google Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`), explanation-only with grounding validation.

## Project Structure

```
risklens-ai/
├── app.py                    # single entry point: python app.py
├── backend/
│   ├── config.py             # env-based settings (thresholds, Gemini model)
│   ├── models.py             # Pydantic models (findings, evidence, AI reports)
│   ├── routes/               # health, data, risk, evidence, investigations, browse
│   └── services/
│       ├── data_generator.py / baseline.py / data_loader.py / data_validation.py
│       ├── risk_engine.py + rules/r01..r05 + finding_validation.py
│       ├── evidence_engine.py + evidence_validation.py
│       └── ai/               # gemini_client, prompt, parser, validator, orchestrator
├── data/                     # transactions, baselines, findings, evidence, contexts, ai cache
├── frontend/src/             # pages, investigation components, charts, api client
├── scripts/                  # generate_data, run_risk_engine, build_evidence
└── tests/                    # 88 tests across all phases
```

## Demo Workflow

STEP 1 — Run `python app.py`, open http://localhost:8000.
STEP 2 — Dashboard: transaction volume, findings, rule distribution.
STEP 3 — Investigations: filter HIGH severity.
STEP 4 — Open **INV-F0481** (C014, R01 HIGH at 29.7× median; same transaction also triggers R04 — rule independence).
STEP 5 — Rule findings: exact amounts, ratios, thresholds.
STEP 6 — Transaction evidence + timeline (TX000012).
STEP 7 — Behavioral baseline vs observed.
STEP 8 — Gemini explanation with source references.
STEP 9 — Click a source reference; trace AI → evidence → finding → transaction.
STEP 10 — State the principle below.

> "The deterministic risk engine is the source of truth. Gemini provides an evidence-grounded investigation explanation and does not independently determine fraud or risk."

## Testing

```bash
pytest            # 88 tests, all phases (mocked Gemini — no key needed)
cd frontend && npm run build
```

Without `GEMINI_API_KEY`, analysis endpoints return `status: unavailable` and every deterministic page keeps working.

## Security

- Secrets live only in local `.env` (gitignored, never tracked); `.env.example` holds placeholders.
- The key never reaches the browser, JSON artifacts, logs, or the frontend bundle (verified).
- AI output is grounding-validated; unknown transaction/finding/rule IDs are rejected.
