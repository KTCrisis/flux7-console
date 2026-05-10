# flux7-console

Governance dashboard for [flux7-mesh](https://github.com/KTCrisis/flux7-mesh) — observe, approve
and govern agents running behind the mesh sidecar.

flux7-console is the operator UI (L2 human layer). flux7-mesh is runtime enforcement (L0 policy).
An optional L1 supervisor like [flux7-supervisor](https://github.com/KTCrisis/flux7-supervisor)
sits in between for automated evaluation.

## Status

The **dashboard** (Next.js 16 + TanStack Query) is operational with 12 routes:

| Route | Purpose |
|-------|---------|
| `/mesh` | Overview — KPIs, inline pending approvals, recent activity, denials |
| `/mesh/agents` | Agent list with stats, detail view with tool usage breakdown |
| `/mesh/traces` | Trace browser with time range + agent/tool/policy filters |
| `/mesh/sessions` | Session list with time range filter, drill-down timeline |
| `/mesh/otel` | OTLP spans with waterfall bars, token counts |
| `/mesh/policies` | Policy viewer (by policy / by tool), KPIs, inline YAML editor with hot-reload |
| `/mesh/approvals` | Pending approvals (expand + approve/deny), resolution history |
| `/mesh/supervisor` | L1 supervisor status — derived from mesh7 traces, implementation-agnostic |
| `/mesh/grants` | Active grants with TTL, create/revoke |
| `/mesh/tools` | Tool catalog (MCP/CLI/REST), MCP server status cards |
| `/mesh/memory` | Memory browser — search, store, edit, delete via mem7 |

### Design

Terminal Noir — deep blue-black palette, dot-grid background, JetBrains Mono (data) + Outfit (UI),
cyan glow accents, glassmorphism sidebar with gradient glow line. Collapsible sidebar nav grouped
by function: Observe (Traces, Sessions, OTEL), Govern (Policies, Approvals, Supervisor, Grants, Tools),
Storage (Memory).

## Architecture

```
                        ┌───────────────────────┐
                        │  flux7-supervisor      │
                        │  (sup7 — L1 agent)     │
                        │  polls + auto-resolves │
                        └───────────┬───────────┘
                                    │
┌───────────────────┐               │  mesh SDK
│  flux7-console    │               │
│  Next.js dashboard│               │
│  localhost:3000   │               │
└─────────┬─────────┘               │
          │                         │
          │  HTTP (rewrites)        │
          ▼                         ▼
┌──────────────────────────────────────────────────┐
│                flux7-mesh (Go)                   │
│  policy engine · approvals · traces · OTEL       │
│              localhost:9090                       │
└──────────────────────────────────────────────────┘
          ▲
          │  JSON-RPC (/rpc)
┌─────────┴─────────┐
│  flux7-memory (Go) │
│  localhost:9070    │
└───────────────────┘
```

The dashboard talks to mesh7 and mem7 via Next.js rewrites (no direct CORS).
The supervisor is a separate agent — the console detects it from trace data.

## Local setup

Prerequisites:

- [flux7-mesh](https://github.com/KTCrisis/flux7-mesh) running on `localhost:9090`
- Node.js 20+
- Optional: [flux7-memory](https://github.com/KTCrisis/flux7-memory) on `localhost:9070` for memory page
- Optional: [flux7-supervisor](https://github.com/KTCrisis/flux7-supervisor) for L1 automated evaluation

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

Backend URLs default to `localhost:9090` (mesh) and `localhost:9070` (mem7).
Override via environment variables in `frontend/.env.local`:

```env
MESH_URL=http://localhost:9090
MEM7_URL=http://localhost:9070
```

These are used by Next.js rewrites in `next.config.ts` (server-side only, no `NEXT_PUBLIC_` needed).

## APIs consumed

**mesh7** (REST):
`/health` `/tools` `/mcp-servers` `/traces` `/otel-traces` `/sessions` `/sessions/:id`
`/approvals` `/approvals/:id` `/approvals/:id/:decision` `/grants` (CRUD) `/policies`

**mem7** (JSON-RPC `/rpc`):
`memory_list` `memory_recall` `memory_search` `memory_store` `memory_forget`

## Repo layout

| Path | Purpose | State |
|------|---------|-------|
| `frontend/` | Next.js 16 dashboard (Turbopack) | Active |
| `backend/` | FastAPI scaffolding | Skeleton |
| `governance-engine/` | Rules / scoring / severity engine | Skeleton |
| `schemas/` | JSON Schemas (agent, flow, template) | Drafted |
| `examples/` | YAML declarations (agents, flows) | Drafted |

> The supervisor was extracted to [flux7-supervisor](https://github.com/KTCrisis/flux7-supervisor)
> as a standalone agent (sup7). The `backend/app/services/supervisor` directory is removed.

## Related

- [flux7-mesh](https://github.com/KTCrisis/flux7-mesh) — runtime enforcement sidecar (Go)
- [flux7-memory](https://github.com/KTCrisis/flux7-memory) — governed memory substrate (Go)
- [flux7-supervisor](https://github.com/KTCrisis/flux7-supervisor) — L1 evaluation agent (Python)
- [docs.flux7.art](https://docs.flux7.art) — documentation
