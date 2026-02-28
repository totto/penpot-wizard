# Architecture — TL;DR

> For the full picture see [ARCHITECTURE.md](ARCHITECTURE.md).

Penpot Wizard runs in three layers that communicate via `postMessage`:

## The Three Layers

| Layer | What it does | Key files |
|-------|-------------|-----------|
| **Plugin** | Executes in Penpot's privileged context. Creates shapes, reads page/component data, handles prototyping. | `src/plugin/plugin.js`, `src/plugin/mainHandlers.js`, `src/plugin/drawHandlers/` |
| **UI** | React app running in an iframe. Chat interface, agent selection, settings, streaming responses. | `src/App.jsx`, `src/components/`, `src/stores/` |
| **Stores** | nanostores atoms for state management. Shared between UI components. | `src/stores/` |

All communication between Plugin and UI uses `postMessage` with `ClientQueryType` enums and unique `messageId` matching for async request/response pairing.

## The Four Agent Types

| Type | Role | Count | Location |
|------|------|-------|----------|
| **Director** | Top-level orchestrator. Talks to user, routes to specialists. | 3 | `agents/penpotWizardAgent.js`, `directorAgents.js` |
| **Capability** | Domain experts: designer, planner, drawer, component-builder, prototyper, illustrator, modifier. | 7 | `agents/*Agent.js`, combined in `agents.js` |
| **Coordinator** | Multi-phase project orchestration: print, web, mobile, style-advisor. | 4 | `coordinatorAgents.js` |
| **Specialized** | Legacy domain agents (UIDesign, UXDesign, WebView, etc.). | 7 | `specializedAgents.js` |

## Data Flow

```
User message
  → Director agent (LLM call, Vercel AI SDK)
    → Tools (draw shapes, query Penpot, search RAG)
    → Capability agents (sub-LLM calls via specializedAgentIds)
      → postMessage → Plugin context
        → Penpot API (createShape, modifyShape, etc.)
          → Canvas update
  → Streaming response back to user
```

## Key Architectural Decisions

- **Separation of contexts**: Plugin and UI are isolated JS environments; `postMessage` is the only bridge. No shared state, no direct function calls.
- **Unified tool shape**: Every tool — drawing, RAG, icon, token, interaction — has `{ id, name, description, inputSchema, function }`. Agents receive a flat list and pick what they need via `toolIds`.
- **Natural language I/O**: Agents take `query` strings and return natural language. No rigid JSON schemas between agents — flexibility over type safety at the agent boundary.
- **Lazy initialization**: Tools and agents initialize only after the API key is validated and the Penpot context is available.
- **RAG as tools**: External knowledge (Penpot docs, Material Design, icons) is accessed via Orama vector search tools, not pre-loaded into system prompts.
