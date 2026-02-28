# KCP Navigation Benchmark

Measures the cost of answering seven developer/agent queries about this codebase — first without the `knowledge.yaml` manifest (baseline), then with it (KCP).

Both sets of agents ran in the same session using the same model (Claude Haiku 4.5). Tool call counts are taken from the API usage metadata (`tool_uses`), not agent self-reports — this is the most accurate measure available.

---

## Methodology

**Baseline**: Seven Haiku agents independently explored the repository using Glob and Read to locate and load relevant documentation. Instruction: "Do NOT read knowledge.yaml — pretend it does not exist." No other constraints.

**KCP**: Seven identical queries given to seven Haiku agents. Instruction: "Read `knowledge.yaml` first. Match the query to the `triggers` and `intent` fields. Read only the file(s) pointed to by the matching unit(s)."

**What was measured**: `tool_uses` from the API usage metadata for each agent call. This counts every tool invocation — Read, Glob, Grep, Bash — regardless of what the agent self-reports.

**Note on token counts**: Source content tokens are estimated from the `token_estimate` fields in `knowledge.yaml` and file sizes. They are clearly labelled as estimates.

---

## Queries

| # | Query | Domain |
|---|-------|--------|
| Q1 | What are the three layers of the architecture, and how does data flow from user message to canvas? | Architecture |
| Q2 | How do I create a new capability agent? What files do I need and what fields are required? | Agents |
| Q3 | What are the fill and stroke properties for shapes, and what is the stacking order rule? | Shapes |
| Q4 | How do I add a new tool? What is the required structure, where do I define it, and how do I register it? | Tools |
| Q5 | How does the postMessage protocol work, and what are the steps to add a new plugin operation end-to-end? | Plugin |
| Q6 | How do I draw a bezier curve path? What commands are available and how do I use cubic bezier? | Drawing |
| Q7 | What design token types are supported, and what token assignment attributes can I apply to shapes? | Tokens |
| Q8 | How do I add support for a new icon library? What files change and what format does the metadata need? | Icons |
| Q9 | How does the approval protocol work for coordinator agents? What are the phases and when does the user approve? | Coordinators |
| Q10 | How do I create and add a new RAG database? What tool generates the embeddings and how do I register it? | RAG |

---

## The single thing to observe

> **9 of 10 queries cost ≤3 tool calls with KCP. Zero do without it.**

Without a manifest, agent navigation cost is unpredictable — ranging from 5 to 19 tool calls depending on how deeply the answer is buried. With the manifest, the ceiling collapses to 3 for every query the manifest covers. The one exception (Q8, icon library, 9 KCP tool calls) is where the manifest has no dedicated icons unit — the agent correctly escalated to the nearest relevant document and kept digging. That's the right behaviour; it's also a signal about where to extend the manifest next.

---

## Results

### Tool calls (from API usage metadata — authoritative)

| Query | Baseline | KCP | Saved |
|-------|----------|-----|-------|
| Q1: Architecture | 5 | 2 | 3 |
| Q2: New agent | 16 | 3 | 13 |
| Q3: Shape fills/strokes | 7 | 2 | 5 |
| Q4: New tool | 14 | 3 | 11 |
| Q5: postMessage | 17 | 3 | 14 |
| Q6: Bezier path | 11 | 2 | 9 |
| Q7: Design tokens | 7 | 2 | 5 |
| Q8: Icon library | 19 | 9 | 10 |
| Q9: Coordinator approval | 9 | 2 | 7 |
| Q10: Add RAG database | 14 | 3 | 11 |
| **Total** | **119** | **31** | **88** |

**74% fewer tool calls** across 10 queries with KCP navigation.

### Source tokens loaded (estimated from manifest token_estimate fields)

| Query | Baseline (est.) | KCP (est.) | Saved |
|-------|----------------|------------|-------|
| Q1: Architecture | ~4,700 | ~2,900 | ~1,800 |
| Q2: New agent | ~9,400 | ~5,900 | ~3,500 |
| Q3: Shape fills/strokes | ~5,550 | ~1,950 | ~3,600 |
| Q4: New tool | ~5,900 | ~3,200 | ~2,700 |
| Q5: postMessage | ~7,000 | ~3,000 | ~4,000 |
| Q6: Bezier path | ~7,650 | ~1,800 | ~5,850 |
| Q7: Design tokens | ~2,350 | ~2,350 | ~0 |
| Q8: Icon library | ~8,500 | ~6,200 | ~2,300 |
| Q9: Coordinator approval | ~6,500 | ~4,000 | ~2,500 |
| Q10: Add RAG database | ~5,800 | ~2,700 | ~3,100 |
| **Total** | **~63,350** | **~34,000** | **~29,350** |

**~46% fewer tokens loaded** with KCP navigation.

Excluding manifest overhead (~1,000 tokens × 10 queries = 10,000 tokens), domain content drops from ~63,350 to ~24,000 tokens — a **~62% reduction**.

---

## What baseline agents did vs. KCP agents

**Baseline agents** — typical pattern:
- Glob project root and docs directory (1–2 calls)
- Read README.md for orientation
- Read 3–6 additional files, sometimes backtracking when wrong file loaded first
- Q2 (new agent) and Q5 (postMessage) were the most expensive: 16 and 17 tool calls respectively, involving reading multiple source files to piece together the answer

**KCP agents** — consistent pattern:
- Read `knowledge.yaml` (1 call)
- Match query to trigger keywords in manifest
- Read the 1–2 files pointed to by matching units
- No backtracking, no mis-reads

---

## Observations

**Q8 is the honest outlier.** The icon library query cost 9 KCP tool calls — higher than every other KCP result. The manifest has no dedicated `icons` unit; the agent matched `extending-tools`, found a mention of the icons system, and correctly kept digging into source files. This is the right behaviour. It also points precisely to where the manifest should grow next: an `icons-tool` unit with `iconsToolCatalog.json` and `iconsTool.js` as its path.

**Q9 is the clearest win.** 9 baseline tool calls to answer "how does the coordinator approval protocol work?" — the agent read the README, architecture doc, AGENTS_GUIDE, coordinator source files, and the director to piece it together. The KCP agent read the manifest and AGENTS_GUIDE: 2 tool calls. One document, found immediately.

**Q4 and Q5 KCP agents loaded both TL;DR and full doc.** Both units share triggers; with a prompt-only KCP simulation, agents matched both and read both. In a proper KCP-MCP bridge, `load_strategy` guidance would steer agents to the summary first. Expected limitation of the simulation — not a manifest design issue — and still only 3 tool calls per query.

**One baseline agent (Q1) organically found TL;DR files.** The `ARCHITECTURE-tldr.md` was discovered without the manifest. TL;DRs add value even without structured routing — but that agent still used 5 tool calls to find them. The KCP agent used 2. The manifest makes routing *reliable*, not just occasionally faster.

---

## KCP manifest at a glance

| Unit | Tokens | Strategy | Summary available |
|------|--------|----------|-------------------|
| `readme` | ~1,800 | eager | — |
| `architecture` | ~1,900 | eager | ✓ → architecture-tldr |
| `architecture-tldr` | ~500 | eager | — |
| `agents-guide` | ~3,000 | lazy | ✓ → agents-guide-tldr |
| `agents-guide-tldr` | ~500 | eager | — |
| `extending-tools` | ~1,700 | lazy | ✓ → extending-tools-tldr |
| `extending-tools-tldr` | ~500 | lazy | — |
| `creating-rags` | ~1,200 | lazy | — |
| `plugin-communication` | ~1,500 | lazy | ✓ → plugin-communication-tldr |
| `plugin-communication-tldr` | ~500 | lazy | — |
| `shape-reference` | ~950 | lazy | — |
| `path-commands` | ~800 | lazy | — |
| `development` | ~1,100 | lazy | — |
| `shape-types-schema` | ~2,300 | lazy | — |
| `tokens-types-schema` | ~1,350 | lazy | — |
| **Total** | **~20,200** | 4 eager / 11 lazy | 4 docs covered |

The 4 eager units load ~4,700 tokens on manifest initialisation and cover architecture, agent types, and key patterns — enough for full project orientation before any specific query.

---

## Reproduce this benchmark

**Baseline**: Run a Haiku agent on each query. Prompt: *"Explore the repository to find the answer. Do NOT read knowledge.yaml."* Record `tool_uses` from the API usage metadata.

**KCP**: Run a Haiku agent on each query. Prompt: *"Read knowledge.yaml first. Match the query to `triggers` and `intent`. Read only the file(s) pointed to by the matching unit(s). Do not explore the repo structure."* Record `tool_uses` from the API usage metadata.

Model: Claude Haiku 4.5. All 20 agents ran in the same session for consistency.

**What to watch for**: Q8 (icon library) consistently costs more with KCP than other queries — no dedicated icons unit in the manifest. Run it and see where the agent gets stuck. That's where the manifest needs to grow.
