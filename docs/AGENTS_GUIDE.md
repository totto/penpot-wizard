# Agents Guide

This guide explains the different agent types in Penpot Wizard and how to create custom agents.

## Agent Types Overview

| Type | Location | Purpose |
|------|----------|---------|
| Director | `agents/penpotWizardAgent.js`, `directorAgents.js` | Top-level orchestrator, handles user chat |
| Capability | `agents/*.js` | Domain experts (design, drawing, planning, prototyping, etc.) |
| Coordinator | `coordinatorAgents.js` | Orchestrates complex projects via specialists |
| Specialized | `specializedAgents.js` | Legacy domain experts (UI, UX, drawing, planning) |

## Universal Agent Network

Penpot Wizard uses a unified agent network that covers any design project:

```
User <--> PenpotWizard (default director)
            |
            +-- penpot-user-guide-rag, design-styles-rag (tutorials, questions)
            +-- designer            (design systems, colors, typography)
            +-- planner             (project planning, phased delivery)
            +-- drawer              (shape drawing, layouts)
            +-- component-builder   (component creation from shapes)
            +-- prototyper          (prototyping, interactions)
            +-- illustrator         (illustrations, icons)
            +-- modifier            (shape modifications)

User <--> DesignStudioDirector (legacy director)
            |
            +-- penpot-user-guide-rag, design-styles-rag (tutorials, questions)
            +-- PrintProjectsCoordinator   (posters, cards, brochures, flyers)
            +-- WebProjectsCoordinator     (landing, apps, dashboards)
            +-- MobileProjectsCoordinator  (iOS, Android, PWA)
            +-- StyleAdvisorCoordinator    (style advice, apply styles)
```

### Directors

- **PenpotWizard** (default): Primary entry point. Professional tool for Penpot that helps users resolve design projects. Uses RAG knowledge bases for guidance, orchestrates capability agents for complex tasks. Always seeks user validation before proceeding.
- **DesignStudioDirector**: Legacy universal entry point. Routes to coordinators for print, web, mobile, or style projects.
- **TestToolsDirector**: Direct tool use for simple tasks. Uses drawing tools, RAG, and image generation without coordinators.

### Capability Agents

These are the new domain-specific agents used by PenpotWizard, defined in `src/assets/agents/`:

- **designer**: Design system creation (colors, typography, spacing, radii).
- **planner**: Project planning and phased delivery.
- **drawer**: Shape drawing and layout execution.
- **component-builder**: Creates library components from shapes.
- **prototyper**: Prototyping, interactions, and flows.
- **illustrator**: Illustrations and icon work.
- **modifier**: Modifies existing shapes (properties, styles, transforms).

### Coordinators

- **PrintProjectsCoordinator**: Posters, cards, brochures, flyers, letterheads. Uses ProjectPlanSpecialist, UIDesignSpecialist, PrintViewDesigner.
- **WebProjectsCoordinator**: Landing pages, web apps, dashboards. Uses ProjectPlanSpecialist, UIDesignSpecialist, UXDesignSpecialist, WebViewDesigner.
- **MobileProjectsCoordinator**: Mobile UI projects. Uses ProjectPlanSpecialist, UIDesignSpecialist, UXDesignSpecialist, MobileViewDesigner.
- **StyleAdvisorCoordinator**: Design style advice and application. Uses UIDesignSpecialist, StyleApplicationSpecialist.

### Specialists (Legacy)

- **UIDesignSpecialist**: Design system (colors, typography, spacing, radii).
- **UXDesignSpecialist**: Views, flows, navigation.
- **ProjectPlanSpecialist**: Phased delivery plan.
- **MobileViewDesigner**: Draws mobile views.
- **PrintViewDesigner**: Draws print layouts (A4, A3, etc.).
- **WebViewDesigner**: Draws web layouts with breakpoints.
- **StyleApplicationSpecialist**: Applies styles to existing shapes.

## Agent Input/Output Architecture

Coordinators and specialists use **natural language** for input and output, not rigid JSON schemas.

### How it works

1. **Input via `description`**: The `description` field documents what information the caller should include (using `<required_input>` tags). The actual tool input is always a single `query` string parameter.

2. **Output via `system`**: The `system` prompt tells the agent what structured output to return (using `<expected_output>` tags).

3. **Function tools keep strict schemas**: Low-level tools (create-rectangle, get-fonts, etc.) that interact directly with the Penpot API still use Zod `inputSchema` for validation.

### Why this design

- LLMs are excellent at generating natural language but unreliable at producing complex nested JSON matching strict schemas
- Schema validation failures were the primary source of errors in the agent chain
- The agent (another LLM) reads the input as text anyway — forcing JSON serialization/deserialization adds no value
- More resilient: partial or imperfect input still works instead of failing validation entirely

## Approval Protocol for Complex Projects

Agents act as **tools for design professionals**, not as autonomous decision-makers. The director enforces this:

1. **Brief validation**: The director gathers all relevant project information from the user through conversation. It asks targeted questions to fill gaps; it does not assume or invent.

2. **Plan presentation**: Before calling a coordinator, the director presents the collected brief and asks for explicit confirmation ("OK to proceed", "continue", etc.).

3. **Phase-by-phase execution**: After each coordinator phase, the director presents the summary and next steps, then waits for user approval before continuing.

4. **No user contact from coordinators**: Coordinators never talk to the user. They return `summary`, `nextSteps`, and `planId` to the director, which then presents them to the user.

**Flow**:
```
User request → Director gathers brief → Director presents plan → User confirms
→ Director calls Coordinator(query: "complete brief...") → Coordinator returns summary/nextSteps
→ Director presents result → User confirms → Director continues or calls next phase
```

## Director Agents

Directors are the main entry point. They receive user messages and coordinate tools and sub-agents.

**Files**: `src/assets/agents/penpotWizardAgent.js` (primary), `src/assets/directorAgents.js` (legacy)
**Combined in**: `src/assets/agents/agents.js` — exports `directorAgents` array with PenpotWizard first

**Structure**:
```javascript
{
  id: "my-director",
  name: "MyDirector",
  description: "When to use this director",
  system: `...`,           // System prompt (personality, instructions)
  toolIds: ["tool-1", "tool-2", "generate-image", "set-image-from-url"],
  specializedAgentIds: ["specialist-1"],
}
```

**Creating a Director**:
1. Add to `directorAgents` array in `directorAgents.js`
2. Define `toolIds` and `specializedAgentIds` as needed
3. Write a clear system prompt with XML sections: `<who_you_are>`, `<language_policy>`, `<workflow>`, etc.

**System prompt tips**:
- Use XML tags for structure
- Specify language handling (reply in user's language)
- List tool selection strategy
- Define edge cases and limitations

## Capability Agents

Capability agents are domain-specific agents used by the PenpotWizard director. Each is defined in its own file under `src/assets/agents/`.

**Files**: `src/assets/agents/designerAgent.js`, `plannerAgent.js`, `drawerAgent.js`, `componentBuilderAgent.js`, `prototyperAgent.js`, `illustratorAgent.js`, `modifierAgent.js`
**Combined in**: `src/assets/agents/agents.js` — exports `capabilityAgents` array (capability + legacy specialized + coordinators)

**Structure**:
```javascript
{
  id: "designer",
  name: "Designer",
  description: `Professional design system agent...`,
  system: `<operational_framework>...</operational_framework>`,
  toolIds: ["design-styles-rag", "create-rectangle", ...],
  specializedAgentIds: [],  // can delegate to other agents
}
```

**Creating a Capability Agent**:
1. Create a new file in `src/assets/agents/` (e.g., `myAgent.js`)
2. Export a single agent object with `id`, `name`, `description`, `system`, `toolIds`, `specializedAgentIds`
3. Import and add it to the `capabilityAgents` array in `src/assets/agents/agents.js`
4. Add its `id` to the director's `specializedAgentIds` so the director can call it

## Coordinator Agents

Coordinators orchestrate specialists for end-to-end projects. They receive a natural language brief via a `query` parameter and return progress updates. Directors call coordinators; coordinators do not talk to the user.

**File**: `src/assets/coordinatorAgents.js`

**Structure**:
```javascript
{
  id: "mobile-projects-coordinator",
  name: "MobileProjectsCoordinator",
  description: `
    Orchestrates mobile UI design projects...

    <required_input>
      Send a query that includes the project brief with:
      - name, description, goals, scope, platform...
    </required_input>
  `,
  system: `
    <role>...</role>
    <behavior>...</behavior>
    <expected_output>
      Return a structured JSON with: success, summary, nextSteps...
    </expected_output>
    <error_handling>...</error_handling>
  `,
  toolIds: ["get-current-page"],
  specializedAgentIds: ["project-plan-specialist", "ui-design-specialist", ...],
}
```

**Note**: Coordinators are stored and initialized together with specialized agents in `specializedAgentsStore.js`.

## Specialized Agents (Legacy)

Specialists are focused sub-agents used by coordinators. They receive a natural language `query` and use their tools to accomplish the task.

**File**: `src/assets/specializedAgents.js`

**Structure**:
```javascript
{
  id: "ui-design-specialist",
  name: "UIDesignSpecialist",
  description: `
    Defines the design system for UI projects...

    <required_input>
      Send a query that includes:
      - project.platform, project.language
      - branding (optional): references, tone, preferredColors, preferredFonts
      - accessibility (optional): target level, requirements
    </required_input>
  `,
  system: `
    <role>...</role>
    <behavior>...</behavior>
  `,
  toolIds: ["penpot-user-guide-rag", "design-styles-rag", "generate-image", "set-image-from-url"],
}
```

**Creating a Specialized Agent**:
1. Add to `specializedAgents` array
2. Document expected input in `description` using `<required_input>` tags
3. Document expected output in `system` using `<expected_output>` tags (optional)
4. Set `toolIds` (include `generate-image` and `set-image-from-url` for image capabilities)
5. Avoid circular dependencies between specialists

## Image Tools

Image generation and placement are handled by tools, not dedicated agents:

- **generate-image**: Generates an image from a text prompt (AI) and applies it as the fill of an existing shape
- **set-image-from-url**: Downloads an image from a URL and applies it as the fill of an existing shape

Add `generate-image` and `set-image-from-url` to `toolIds` for directors or specialists that need image capabilities.

## User-Created Agents

Users can create custom directors and specialists via `userAgentsStore`. These are persisted and combined with predefined agents:
- Directors: `$combinedDirectorAgents` in directorAgentsStore
- Specialists: `$userSpecializedAgents` in userAgentsStore, combined in specializedAgentsStore

User-created agents can optionally provide a JSON Schema `inputSchema` for structured input. If no schema is provided, they use the same `query` string pattern as predefined agents.

## Best Practices

- **Avoid circular dependencies**: Specialist A → Specialist B → Specialist A
- **Structured prompts**: Use XML tags (`<role>`, `<behavior>`, `<rules>`, `<expected_output>`)
- **Clear descriptions**: The AI uses `description` to decide when to call an agent. Use `<required_input>` to document what the caller should include.
- **Natural language input**: Coordinators and specialists receive a `query` string. Document expected fields in description but keep input flexible.
- **Output in system**: Use `<expected_output>` in the system prompt to guide the agent's response format.
