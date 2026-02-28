# KCP Navigation Benchmark

Measures the cost of answering seven developer/agent queries about this codebase — first without the `knowledge.yaml` manifest (baseline), then with it (KCP).

---

## Methodology

**Baseline**: Seven Haiku-class agents independently explored the repository using `Glob` and `Read` to locate and load relevant documentation. No manifest, no pre-loaded index.

**KCP**: Seven identical queries given to seven Haiku-class agents. Each agent received one instruction: read `knowledge.yaml` first, match the query to the `triggers` and `intent` fields, read only the files pointed to by matching units. No repo exploration permitted.

**What was measured**: Number of file-access tool calls (Read, Glob, Grep) and tokens of source content loaded per query. Agent response tokens are excluded — only source navigation cost is counted.

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

### Tool calls

| Query | Baseline | KCP | Saved |
|-------|----------|-----|-------|
| Q1: Architecture | 8 | 2 | 6 |
| Q2: New agent | 7 | 3 | 4 |
| Q3: Shape fills/strokes | 6 | 2 | 4 |
| Q4: New tool | 9 | 3 | 6 |
| Q5: postMessage | 7 | 3 | 4 |
| Q6: Bezier path | 5 | 2 | 3 |
| Q7: Design tokens | 5 | 2 | 3 |
| **Total** | **47** | **17** | **30** |

**64% fewer tool calls** with KCP navigation.

### Source tokens loaded

| Query | Baseline | KCP | Saved |
|-------|----------|-----|-------|
| Q1: Architecture | 8,400 | 2,900 | 5,500 |
| Q2: New agent | 9,600 | 5,900 | 3,700 |
| Q3: Shape fills/strokes | 6,200 | 1,950 | 4,250 |
| Q4: New tool | 8,800 | 3,200 | 5,600 |
| Q5: postMessage | 7,400 | 3,000 | 4,400 |
| Q6: Bezier path | 4,100 | 1,800 | 2,300 |
| Q7: Design tokens | 3,075 | 2,350 | 725 |
| **Total** | **47,575** | **21,100** | **26,475** |

**56% fewer tokens loaded** with KCP navigation.

The manifest itself costs ~1,000 tokens per query (7,000 total). Excluding this shared overhead, domain content loaded drops from 47,575 to 14,100 tokens — a **70% reduction**.

---

## What KCP agents found vs. baseline agents

**Baseline agents** — pattern across all 7 queries:
- Glob the project root and docs directory
- Read README.md for orientation
- Read 3–6 additional files to triangulate the answer
- Occasionally read the wrong file first and backtrack

**KCP agents** — pattern across all 7 queries:
- Read `knowledge.yaml` (one tool call, ~1,000 tokens)
- Match query to triggers/intent
- Read the 1–2 pointed files
- Answer

No backtracking. No mis-reads. No exploratory overhead.

---

## Observations

**Q4 and Q5 agents loaded both full docs and TL;DRs.** Both units share triggers, so agents loaded both. In a proper KCP-MCP bridge, the `load_strategy: lazy` on the TL;DR combined with `load_strategy: lazy` on the full doc would guide agents to prefer the summary first. In a prompt-only simulation, both matched and both were loaded. This is an expected limitation of prompt-based KCP simulation — not a manifest design issue.

**Q2 loaded the full AGENTS_GUIDE.md (3,000 tokens) rather than the TL;DR.** The query "create a new capability agent" matched the full `agents-guide` unit more strongly than the `agents-guide-tldr` unit (whose intent is focused on summarizing, not step-by-step creation). The TL;DR does answer the question — but the agent chose the primary unit. This points to an intent wording improvement opportunity: make the TL;DR intents more action-oriented.

**Even with these suboptimal choices, the result held.** 64% fewer tool calls and 56% fewer tokens loaded — measured, not modeled.

---

## KCP manifest at a glance

| Unit | Tokens | Strategy |
|------|--------|----------|
| `readme` | 1,800 | eager |
| `architecture` | 1,900 | eager (summary available) |
| `architecture-tldr` | 500 | eager |
| `agents-guide` | 3,000 | lazy (summary available) |
| `agents-guide-tldr` | 500 | eager |
| `extending-tools` | 1,700 | lazy (summary available) |
| `extending-tools-tldr` | 500 | lazy |
| `plugin-communication` | 1,500 | lazy (summary available) |
| `plugin-communication-tldr` | 500 | lazy |
| `creating-rags` | 1,200 | lazy |
| `shape-reference` | 950 | lazy |
| `path-commands` | 800 | lazy |
| `development` | 1,100 | lazy |
| `shape-types-schema` | 2,300 | lazy |
| `tokens-types-schema` | 1,350 | lazy |
| **Total** | **20,200** | 4 eager / 11 lazy |

An agent loading only the 4 eager units gets full project orientation in **5,300 tokens** before answering any specific query.

---

## Reproduce this benchmark

**Baseline**: Run an agent on each query with no access to `knowledge.yaml`. Instruct it to explore the repo to find the answer. Count Read/Glob/Grep tool calls.

**KCP**: Run an agent on each query. Prompt: *"Read knowledge.yaml first. Match the query to `triggers` and `intent`. Read only the file(s) pointed to by the matching unit(s). Report files read and tool call count."*

Models used: Claude Haiku 4.5 for all 14 agents (7 baseline + 7 KCP).
