# KCP Demo: See the Difference

One query. Two agents. Watch what each one does.

---

## The query

> **"How does the approval protocol work for coordinator agents? What are the phases and when does the user approve?"**

This is a question you'd ask when extending or debugging the coordinator system. The answer lives in `AGENTS_GUIDE.md`. Both agents find it — but the paths are very different.

---

## Run it yourself

Paste these prompts into Claude Code (or any agent with file access to this repo). Record how many files each agent reads.

**Baseline agent** — no manifest:
```
Explore the penpot-wizard repository to answer this question.
Use Glob and Read to find relevant files. Do NOT read knowledge.yaml.

Question: How does the approval protocol work for coordinator agents?
What are the phases and when does the user need to approve?
```

**KCP agent** — manifest first:
```
Read knowledge.yaml first. Look at the triggers and intent fields.
Read only the file(s) pointed to by the matching unit(s).
Do not explore the repo structure.

Question: How does the approval protocol work for coordinator agents?
What are the phases and when does the user need to approve?
```

---

## What happened when we ran them

### Baseline agent — 9 tool calls

The agent had no index. It started at the root and worked outward.

| Step | Tool | File | Why |
|------|------|------|-----|
| 1 | Glob | `/` | Discover project structure |
| 2 | Read | `README.md` | Get orientation |
| 3 | Glob | `docs/` | Find documentation |
| 4 | Read | `docs/ARCHITECTURE.md` | Understand agent layers |
| 5 | Read | `src/assets/coordinatorAgents.js` | Find coordinator definitions |
| 6 | Read | `src/assets/agents/penpotWizardAgent.js` | Find director behaviour |
| 7 | Grep | `"approval"` across source | Search for approval logic |
| 8 | Read | `docs/AGENTS_GUIDE.md` | Finally — the right document |
| 9 | Read | `docs/AGENTS_GUIDE-tldr.md` | Cross-check summary |

Nine steps. The agent eventually reached the right document — but only after exploring the root, reading the README, checking the architecture, reading source files, and running a grep. Steps 1–7 produced nothing the answer needed.

---

### KCP agent — 2 tool calls

The agent read the manifest first.

| Step | Tool | File | Why |
|------|------|------|-----|
| 1 | Read | `knowledge.yaml` | Load the index |
| 2 | Read | `docs/AGENTS_GUIDE.md` | Trigger match: "coordinator, approval protocol" → `agents-guide` unit |

Two steps. The manifest's `agents-guide` unit has `coordinator` and `approval protocol` in its triggers. The agent matched immediately and went directly to the source.

---

## The answer both agents returned

Both agents answered correctly. The quality of the answer was identical. What differed was everything before the answer existed.

The approval protocol (from `AGENTS_GUIDE.md`):

1. **Brief gathering** — director collects project details from the user
2. **Plan presentation** — director presents the brief, waits for explicit user confirmation before calling any coordinator
3. **Phase execution** — coordinator runs, returns `{ summary, nextSteps, planId }`
4. **Phase approval** — director presents the summary, waits for user approval before the next phase
5. **Repeat** — no coordinator phase runs without explicit user confirmation

Coordinators never contact the user. All communication flows through the director.

---

## The full dataset

This is one query from a 10-query benchmark. Full results at [BENCHMARK.md](BENCHMARK.md).

| | 10 queries total |
|--|-----------------|
| Baseline tool calls | 119 |
| KCP tool calls | 31 |
| Reduction | **74%** |

**9 of 10 queries cost ≤3 KCP tool calls. Zero baseline queries do.**

The one exception is Q8 (adding an icon library) — the manifest has no dedicated icons unit, so the agent correctly escalated. That gap is documented in BENCHMARK.md as the next place to extend the manifest.

---

## What the manifest looks like for this query

The `agents-guide` unit in `knowledge.yaml`:

```yaml
- id: agents-guide
  path: docs/AGENTS_GUIDE.md
  kind: knowledge
  intent: "What agent types exist (director, capability, coordinator, specialized),
           how do I create a custom agent, what is the approval protocol for complex
           projects, and how do agents compose via toolIds and specializedAgentIds?"
  triggers:
    - coordinator
    - approval protocol
    - director
    - create agent
    - capability
    - ...
  hints:
    token_estimate: 3000
    load_strategy: lazy
    summary_available: true
    summary_unit: agents-guide-tldr
```

The `intent` is a sentence written as the question the document answers. The `triggers` are the keywords an agent would use when searching for this information. When the agent reads the manifest and matches "coordinator" and "approval protocol" — it goes directly here.

---

## Set up the KCP-MCP bridge (optional)

If you want agents to use the manifest automatically without a prompt instruction:

```bash
pip install kcp-mcp
```

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "penpot-wizard-knowledge": {
      "command": "kcp-mcp",
      "args": ["knowledge.yaml"]
    }
  }
}
```

Agents can then call `resources/list` to browse the manifest and load units by intent. The `load_strategy: eager` units (readme, architecture, architecture-tldr, agents-guide-tldr) load automatically on session start — 4,700 tokens of orientation before any question is asked.
