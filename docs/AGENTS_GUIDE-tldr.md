# Agents Guide — TL;DR

> For the full picture see [AGENTS_GUIDE.md](AGENTS_GUIDE.md).

## The Four Agent Types

### 1. Directors
Entry points for user conversation. Route tasks to capability agents or tools.

| Name | Role |
|------|------|
| `PenpotWizard` | Default. Routes to any capability agent or tool. General purpose. |
| `DesignStudioDirector` | Routes to coordinators for full project workflows. |
| `TestToolsDirector` | Uses tools directly, no sub-agents. For testing. |

Defined in `src/assets/agents/penpotWizardAgent.js` + `src/assets/agents/directorAgents.js`.

### 2. Capability Agents (7)
Domain specialists invoked by directors via `specializedAgentIds`.

| Agent | Handles |
|-------|---------|
| `designer` | Layout decisions, design system choices, component structure |
| `planner` | Breaking complex tasks into steps |
| `drawer` | Shape creation: rectangles, ellipses, paths, text, boards |
| `component-builder` | Building reusable Penpot components |
| `prototyper` | Interactions, flows, hover states |
| `illustrator` | Vector illustrations and icons |
| `modifier` | Modifying existing shapes and layouts |

### 3. Coordinators (4)
Orchestrate full projects through multiple phases with user approval checkpoints.

`PrintProjects`, `WebProjects`, `MobileProjects`, `StyleAdvisor` — in `coordinatorAgents.js`.

### 4. Specialized Agents (legacy, 7)
Older domain agents (`UIDesign`, `UXDesign`, `WebView`, etc.) in `specializedAgents.js`.
Still functional; prefer capability agents for new work.

---

## Creating a New Capability Agent

**1. Create the file** `src/assets/agents/myAgent.js`:

```js
export const myAgent = {
  id: 'my-agent',
  name: 'My Agent',
  description: 'What this agent does and when to invoke it.',
  system: `<role>...</role><behavior>...</behavior><rules>...</rules>`,
  toolIds: ['tool-id-1', 'tool-id-2'],
  specializedAgentIds: []
}
```

**2. Register it** — add to `capabilityAgents` array in `src/assets/agents/agents.js`.

**3. Wire to director** — add `'my-agent'` to `specializedAgentIds` in `penpotWizardAgent.js`.

---

## Key Patterns

**XML-structured system prompts**: Use `<role>`, `<behavior>`, `<rules>`, `<workflow>`, `<expected_output>` tags. The LLM follows XML structure reliably.

**Natural language I/O**: Agents receive `query` strings, return natural language. Document expected input with `<required_input>` tags; expected output with `<expected_output>` tags.

**Approval protocol** (coordinators):
1. Director gathers brief → presents plan → user confirms
2. Coordinator executes phase 1 → director presents → user approves
3. Repeat per phase

**Stacking order rule** (critical for `drawer`): Create shapes foreground-first, backgrounds last. Penpot stacks in reverse creation order.

**Avoid circular dependencies**: Agents must not invoke each other in cycles.
