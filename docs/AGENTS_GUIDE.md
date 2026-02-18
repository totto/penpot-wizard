# Agents Guide

This guide explains the different agent types in Penpot Wizard and how to create custom agents.

## Agent Types Overview

| Type | Location | Purpose |
|------|----------|---------|
| Director | `directorAgents.js` | Top-level orchestrator, handles user chat |
| Coordinator | `coordinatorAgents.js` | Orchestrates complex projects via specialists |
| Specialized | `specializedAgents.js` | Domain experts (UI, UX, drawing, planning) |
| Image Generation | `imageGenerationAgents.js` | Generates images, returns imageId for shapes |

## Director Agents

Directors are the main entry point. They receive user messages and coordinate tools and sub-agents.

**File**: `src/assets/directorAgents.js`

**Structure**:
```javascript
{
  id: "my-director",
  name: "MyDirector",
  description: "When to use this director",
  system: `...`,           // System prompt (personality, instructions)
  toolIds: ["tool-1", "tool-2"],
  specializedAgentIds: ["specialist-1"],
  imageGenerationAgentIds: ["image-generator"],  // optional
}
```

**Creating a Director**:
1. Add to `directorAgents` array in `directorAgents.js`
2. Define `toolIds`, `specializedAgentIds`, `imageGenerationAgentIds` as needed
3. Write a clear system prompt with XML sections: `<who_you_are>`, `<language_policy>`, `<workflow>`, etc.

**System prompt tips**:
- Use XML tags for structure
- Specify language handling (reply in user's language)
- List tool selection strategy
- Define edge cases and limitations

## Coordinator Agents

Coordinators orchestrate specialists for end-to-end projects. They receive structured briefs and return progress updates. Directors call coordinators; coordinators do not talk to the user.

**File**: `src/assets/coordinatorAgents.js`

**Structure**:
```javascript
{
  id: "mobile-projects-coordinator",
  name: "MobileProjectsCoordinator",
  description: "When to use this coordinator",
  system: `...`,
  inputSchema: z.object({
    project: z.object({
      name: z.string(),
      description: z.string(),
      goals: z.array(z.string()),
      scope: z.enum(['MVP', 'Full', 'Iterative']),
      platform: z.enum(['iOS', 'Android', 'Both', 'PWA']),
      targetAudience: z.string(),
      keyUseCases: z.array(z.string()),
      keyFeatures: z.array(z.string()),
      // ...
    }),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    summary: z.string(),
    nextSteps: z.array(z.string()),
    planId: z.string().nullable(),
  }),
  toolIds: ["get-project-data", "get-current-page"],
  specializedAgentIds: ["project-plan-specialist", "ui-design-specialist", "ux-design-specialist", "mobile-view-designer"],
}
```

**Note**: Coordinators are stored and initialized together with specialized agents in `specializedAgentsStore.js`.

## Specialized Agents

Specialists are focused sub-agents with input/output schemas. They can use tools and image generation agents.

**File**: `src/assets/specializedAgents.js`

**Structure**:
```javascript
{
  id: "ui-design-specialist",
  name: "UIDesignSpecialist",
  description: "When the director/coordinator should call this specialist",
  system: `...`,
  inputSchema: z.object({...}),
  outputSchema: z.object({
    designSystem: z.object({
      colorPalette: z.array(z.object({...})),
      typography: z.object({...}),
      spacing: z.array(z.number()),
      radii: z.array(z.number()),
      // ...
    }),
  }),
  toolIds: ["penpot-user-guide-rag", "get-available-fonts"],
  imageGenerationAgentIds: ["image-generator"],  // optional
}
```

**Creating a Specialized Agent**:
1. Add to `specializedAgents` array
2. Define `inputSchema` and `outputSchema` (Zod)
3. Set `toolIds` and optionally `imageGenerationAgentIds`
4. Avoid circular dependencies between specialists

## Image Generation Agents

These agents generate images from text and return an `imageId` for use as `backgroundImage` in shapes.

**File**: `src/assets/imageGenerationAgents.js`

**Structure**:
```javascript
{
  id: "image-generator",
  name: "imageGenerator",
  description: "Use when you need to generate images from text descriptions...",
  system: `...`,
}
```

Directors and specialists add `imageGenerationAgentIds: ["image-generator"]` to enable image generation.

## User-Created Agents

Users can create custom directors and specialists via `userAgentsStore`. These are persisted and combined with predefined agents:
- Directors: `$combinedDirectorAgents` in directorAgentsStore
- Specialists: `$userSpecializedAgents` in userAgentsStore, combined in specializedAgentsStore

## Best Practices

- **Avoid circular dependencies**: Specialist A → Specialist B → Specialist A
- **Structured prompts**: Use XML tags (`<role>`, `<behavior>`, `<rules>`)
- **Clear descriptions**: The AI uses `description` to decide when to call an agent
- **Consistent output schemas**: Use Zod with `.describe()` for clarity
