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

| # | Query |
|---|-------|
| Q1 | What are the three layers of the architecture, and how does data flow from user message to canvas? |
| Q2 | How do I create a new capability agent? What files do I need and what fields are required? |
| Q3 | What are the fill and stroke properties for shapes, and what is the stacking order rule? |
| Q4 | How do I add a new tool? What is the required structure, where do I define it, and how do I register it? |
| Q5 | How does the postMessage protocol work, and what are the steps to add a new plugin operation end-to-end? |
| Q6 | How do I draw a bezier curve path? What commands are available and how do I use cubic bezier? |
| Q7 | What design token types are supported, and what token assignment attributes can I apply to shapes? |

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
| **Total** | **77** | **17** | **60** |

**78% fewer tool calls** with KCP navigation.

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
| **Total** | **~42,550** | **~21,100** | **~21,450** |

**~50% fewer tokens loaded** with KCP navigation.

Excluding manifest overhead (~1,000 tokens × 7 queries = 7,000 tokens shared cost), domain content drops from ~42,550 to ~14,100 tokens — a **~67% reduction**.

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

**One baseline agent (Q1) organically found the TL;DR files.** The TL;DRs we added (`ARCHITECTURE-tldr.md`, `PLUGIN_COMMUNICATION-tldr.md`) were discovered by the baseline Q1 agent without the manifest. This shows TL;DRs add value even without structured routing — but the baseline agent still made 5 tool calls to find them. The KCP agent made 2. The manifest makes routing *reliable*, not just occasionally faster.

**Q4 and Q5 KCP agents loaded both TL;DR and full doc.** Both units share triggers; with a prompt-only KCP simulation, agents matched both and read both. In a proper KCP-MCP bridge, `load_strategy` guidance would steer agents to the summary first. This is an expected limitation of the simulation setup — not a manifest design issue — and it still produced only 3 tool calls per query.

**Q7 tokens were equal.** The `tokensTypes.js` schema is the right file for both approaches. KCP routed there directly; baseline also found it quickly (7 tool calls vs 2, but similar content loaded). The tool call advantage holds even when the token advantage is small.

**Q2 was the clearest win.** 16 baseline tool calls to answer "how do I create a new agent?" — the agent read the AGENTS_GUIDE, the TL;DR, the architecture doc, and then 8 source files to verify the pattern. The KCP agent read the manifest and the AGENTS_GUIDE: 3 tool calls.

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

Model: Claude Haiku 4.5. Both runs in the same session for consistency.
