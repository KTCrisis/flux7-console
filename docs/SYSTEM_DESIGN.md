# System Design — agent-mesh + mem7 + agent7

*May 2026. Living document.*

## The stack in one sentence

**agent-mesh** enforces what agents can do. **mem7** remembers what happened. **agent7** shows it all and lets humans intervene.

## Design principles

1. **Each project works alone.** agent-mesh without mem7 still enforces policies. mem7 without agent-mesh is a standalone memory server. agent7 without the others is a governance dashboard. Integration is opt-in, not required.
2. **Open-source runtime, product on top.** agent-mesh and mem7 are MIT/Apache — free, adoptable, no lock-in. agent7 is the management plane that makes them manageable at scale. That's where the business model sits.
3. **Decisions are facts.** When a human approves an action or a supervisor auto-resolves a request, that decision is stored as a queryable fact in mem7. It doesn't vanish into a log file.
4. **Write path matters more than read path.** The system becomes valuable when events automatically flow between components — not when a human manually checks dashboards.

---

## Components

### agent-mesh (runtime / data plane)

Go binary. Sidecar proxy between agents and their tools.

| What it does | How |
|---|---|
| Policy enforcement | YAML rules: allow, deny, human_approval per tool per agent |
| Approval queue | Pending requests, resolve via API or Claude Code prompt |
| Rate limiting + loop detection | Per-agent, per-tool, configurable |
| Tracing | JSONL trace files, OTEL export, session tracking |
| Grants | Temporary sudo-like bypass for specific agents |
| Supervisor protocol | External process polls pending approvals, auto-resolves routine ones |

**Current state:** v0.8.6, stable, docs polished.

### mem7 (memory substrate)

Go binary. MCP server for persistent, searchable, governed memory.

| What it does | How |
|---|---|
| Store/recall/search/forget | 7 MCP tools, markdown source of truth + SQLite FTS5 index |
| Hybrid search | BM25 + dense cosine (Ollama/OpenAI) + LLM reranking |
| Structured recall | `memory_context` returns JSON for SDK consumption |
| Tag-scoped access | Any agent reads/writes its own observations via tags |
| Temporal range queries | `since` / `until` filters on RFC3339 timestamps |
| Python SDK | `pip install mem7`, provider-agnostic, wraps all tools via HTTP |

**Current state:** v0.4.0, 71% LoCoMo benchmark, SDK shipped.

### agent7 (management plane / product)

Next.js 16 + FastAPI + PostgreSQL. Dashboard, governance engine, supervisor UI.

| What it does | How |
|---|---|
| Agent catalog | Registry of declared agents with metadata, scoring, lifecycle |
| Governance engine | Rules, scoring (3-axis), severity escalation, validation verdicts |
| Trace viewer | Ingests agent-mesh JSONL, aggregates stats, detects ghosts/orphans |
| Memory viewer | Reads mem7 via SDK, displays stored facts and decisions |
| Human approval UI | Shows pending approvals from agent-mesh, human clicks approve/reject |
| Dependency graph | Declared (YAML) + inferred (traces), impact analysis |
| Diff engine | Breaking change detection on agent config changes |

**Current state:** Early stage, dashboard + traces + sessions + memory debug view working. No version tag yet.

---

## The integrated flow

### Today: tool call with human approval

```
Developer → Claude Code → agent-mesh → gmail.send_email
                                │
                    policy: human_approval
                                │
                    Claude Code shows permission prompt
                                │
                    Developer says "yes"
                                │
                    agent-mesh resolves → email sent
                    agent-mesh writes trace → JSONL
                                │
                    Decision is gone. Next time, same question.
```

### Target: tool call with governed memory

```
Developer → Claude Code → agent-mesh → gmail.send_email
                                │
                    policy: human_approval
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                   │
      Supervisor (L1)     Human (L2)          agent7 UI
      in agent-mesh       via Claude Code     shows pending
             │            or agent7 UI              │
             │                  │                   │
      checks mem7:              │                   │
      "has Marc approved        │                   │
       gmail.send before?"      │                   │
             │                  │                   │
      if yes (3+ times) ───► auto-approve           │
      if no ────────────► escalate to human ◄───────┘
                                │
                    human says "yes"
                                │
                    agent-mesh resolves → email sent
                    agent-mesh writes to mem7:
                      key: "decision.gmail.send_email.20260507"
                      value: "approved by Marc, recipient: X, subject: Y"
                      tags: [decision, approval, gmail]
                      agent: "agent-mesh"
                                │
                    agent7 displays decision in audit trail
```

### What changes

| Step | Before | After |
|---|---|---|
| Approval source | Always human | Supervisor checks mem7 first, escalates if unsure |
| Decision storage | Lost in terminal history | Stored as fact in mem7, queryable |
| Learning | None — same prompt every time | Supervisor learns from past decisions |
| Audit | Grep JSONL logs | agent7 dashboard, filterable, searchable |
| Visibility | Only the developer who approved | Any team member via agent7 |

---

## Data flow between components

```
                    agent7 (management plane)
                    ┌────────────────────────────┐
                    │  dashboard, approval UI,   │
                    │  governance, audit trail    │
                    └──────┬──────────┬──────────┘
                           │          │
              reads via    │          │  reads via
              HTTP API     │          │  Python SDK
                           │          │
                           ▼          ▼
┌─────────────────┐    ┌─────────────────┐
│   agent-mesh    │───►│     mem7        │
│   (runtime)     │    │   (memory)      │
│                 │    │                 │
│ • traces JSONL  │    │ • facts         │
│ • approvals     │    │ • decisions     │
│ • policies      │    │ • observations  │
└────────┬────────┘    └─────────────────┘
         │                     ▲
         │  writes decisions   │
         └─────────────────────┘
         (opt-in, if mem7 configured)
```

### Write paths (who writes what where)

| Writer | Target | What | When |
|---|---|---|---|
| Any agent | mem7 | Observations, facts, context | During execution, via MCP store |
| agent-mesh | mem7 | Approval/rejection decisions | On approval resolve (opt-in) |
| agent-mesh | JSONL | Tool call traces | Every tool call (always) |
| Supervisor | mem7 | Auto-resolve rationale | On auto-approve (opt-in) |
| Human via agent7 | agent-mesh API | Approve/reject action | Clicking in UI |
| agent7 | PostgreSQL | Aggregated stats, governance scores | On trace ingestion, on sync |

### Read paths (who reads what from where)

| Reader | Source | What | When |
|---|---|---|---|
| Supervisor | mem7 | Past decisions for same pattern | Before deciding to auto-approve |
| Any agent | mem7 | Stored facts, context, history | During execution, via MCP search |
| agent7 | agent-mesh API | Pending approvals | Polling for approval UI |
| agent7 | agent-mesh JSONL | Trace history | On ingestion (CLI or API push) |
| agent7 | mem7 (SDK) | Stored decisions, facts | For memory viewer, audit trail |
| agent7 | PostgreSQL | Scores, rules, lifecycle | For governance dashboard |

---

## Approval architecture (detailed)

### Trust hierarchy

```
Level 0: Policy engine (agent-mesh)
         Static rules. Instant. No judgment.
         allow reads, deny deletes, require approval for sends.

Level 1: Supervisor (in agent-mesh)
         Dynamic evaluation. Fast. Bounded judgment.
         Checks mem7 for past decisions. Auto-approves routine patterns.
         Escalates unknowns to Level 2.

Level 2: Human
         Full judgment. Slow. Expensive attention.
         Sees pending in Claude Code prompt OR agent7 UI.
         Decision written back to mem7 via agent-mesh.
```

> **On the word "supervisor".** Level 1 here is an *implementation* of the
> [supervisor protocol](https://github.com/KTCrisis/agent-mesh/blob/main/docs/supervisor-protocol.md)
> that agent-mesh already exposes for external resolvers. The `supervisor/`
> package inside the agent-mesh repo is a different concern — it handles
> content redaction and prompt-injection detection on the protocol's
> outbound payloads (`RedactParams`, `DetectInjection`). Phase 2 is a new
> resolver implementing the protocol that consults mem7 before deciding —
> not a new concept, not a renamed package. Each project keeps a single
> meaning for "supervisor": agent-mesh exposes the protocol, the resolver
> implements it.

### Supervisor decision logic (pseudocode)

```python
def evaluate(request, mem7_client):
    # Check mem7 for similar past decisions
    past = mem7_client.context(
        f"{request.tool} {request.agent}",
        tags=["decision"],
        limit=10
    )

    approved_count = sum(1 for m in past if "approved" in m.value)
    rejected_count = sum(1 for m in past if "rejected" in m.value)

    # Pattern: consistently approved → auto-approve
    if approved_count >= 3 and rejected_count == 0:
        return AutoApprove(reason=f"approved {approved_count} times before")

    # Pattern: recently rejected → auto-deny
    recent_reject = [m for m in past if "rejected" in m.value and is_recent(m, days=7)]
    if recent_reject:
        return AutoDeny(reason="rejected recently, escalate")

    # Unknown pattern → escalate to human
    return Escalate(reason="no clear precedent")
```

### Where the approval UI lives

**Claude Code terminal** — the developer gets the prompt inline. This is the current flow, works for solo use.

**agent7 web UI** — for team use, overnight runs, or when multiple agents generate approvals faster than one human can handle. agent7 polls agent-mesh's pending queue, displays context, human clicks. agent7 POSTs back to agent-mesh `/approval/resolve`.

Both are **thin clients** of the agent-mesh approval API. If agent7 goes down, Claude Code still works. If both go down, requests queue in agent-mesh until someone resolves them (fail-safe, not fail-open).

---

## Deployment

### Solo developer (current setup)

```
laptop
├── agent-mesh (Go binary, sidecar)
│   ├── config.yaml (policies)
│   └── traces/ (JSONL)
├── mem7 (Go binary, MCP stdio via agent-mesh)
│   └── ~/.mem7/ (markdown + SQLite)
└── Claude Code / Cursor (agent)
```

No agent7 needed. agent-mesh + mem7 provide full governance + memory. The developer is the human-in-the-loop via terminal prompts.

### Small team

```
shared server
├── agent-mesh (central, HTTP mode)
├── mem7 serve (HTTP, shared memory)
└── agent7 (dashboard + supervisor)
    └── PostgreSQL

developer laptops
└── agents connect to shared agent-mesh
```

agent7 adds value: team visibility, approval UI for shared agents, governance scoring, audit trail.

### Enterprise (future)

```
agent7 SaaS (hosted)
├── governance engine
├── approval UI
├── audit + compliance
└── policy push → customer agent-mesh

customer infra
├── agent-mesh (sidecar per agent)
├── mem7 (per-team or central)
└── agents (any framework)
```

---

## Implementation priorities

### Phase 1: Decision write path (agent-mesh → mem7)

The highest-leverage integration. When an approval resolves in agent-mesh, store the decision in mem7 if a mem7 server is configured.

**agent-mesh changes:**
- New optional config field: `memory_server: http://localhost:9070` (+ optional token)
- In the approval resolve handler: POST to mem7 `/rpc` with `memory_store`
- Key format: `decision.<tool>.<timestamp>`
- Tags: `[decision, approval|rejection, <tool_category>]`
- Value: human-readable summary of what was approved/rejected and by whom
- Graceful degradation: if mem7 is down, log warning, don't block the approval

**Estimated effort:** 50-100 lines Go in agent-mesh.

### Phase 2: Supervisor reads mem7

The supervisor (currently in agent7, target: in agent-mesh) queries mem7 before deciding.

**agent-mesh changes:**
- Supervisor mode queries mem7 `memory_context` with tool name + agent + tags=["decision"]
- Decision logic: count past approvals/rejections, apply thresholds
- Auto-approve if pattern is clear, escalate if ambiguous

**Estimated effort:** ~200 lines Go.

### Phase 3: agent7 reads mem7 via SDK

Replace the current ad-hoc memory debug view with proper SDK integration.

**agent7 changes:**
- `pip install mem7` in backend dependencies
- Backend service: `Mem7Client` wrapping the SDK, configured via env var
- API routes: `/api/v1/memory/search`, `/api/v1/memory/decisions`
- Frontend: memory viewer page, decision audit trail with filters

**Estimated effort:** ~500 lines Python + frontend.

### Phase 4: agent7 approval UI as thin client

agent7 displays pending approvals from agent-mesh and lets humans resolve them.

**agent7 changes:**
- Poll agent-mesh `/approval/pending` (API already exists)
- Display: tool call details, agent identity, past decisions from mem7 (context)
- Action: approve/reject button → POST agent-mesh `/approval/resolve`
- agent-mesh handles the mem7 write (phase 1), agent7 doesn't write to mem7 directly

**Estimated effort:** ~400 lines Python + frontend.

---

## What this enables (end state)

1. **Adaptive governance.** Policies start strict (human approval for everything). As the system collects approved patterns in mem7, the supervisor auto-approves routine actions. Governance gets less intrusive over time without getting less safe.

2. **Cross-agent memory.** Agent A stores an observation. Agent B searches and finds it. The supervisor checks if a decision was already made. All through the same mem7 store, scoped by tags.

3. **Audit without effort.** Every decision is a fact in mem7. Every tool call is a trace in agent-mesh. agent7 joins them: "this agent called this tool, it was approved because of this past decision, here's the full chain." Compliance teams query, they don't grep.

4. **Progressive adoption.** Day 1: install agent-mesh, get policies and tracing. Day 30: add mem7, get persistent memory. Day 60: add agent7, get visibility and team governance. Each step is independently valuable.

---

*Three projects, one system. Independent by default, powerful together.*
