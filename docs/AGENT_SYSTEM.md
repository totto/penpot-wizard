# Multi-Agent System

## Table of Contents
- [Overview](#overview)
- [Agent Hierarchy](#agent-hierarchy)
- [Director Agents](#director-agents)
- [Coordinator Agents](#coordinator-agents)
- [Specialized Agents](#specialized-agents)
- [Image Generation Agents](#image-generation-agents)
- [Agent Communication](#agent-communication)
- [Creating Custom Agents](#creating-custom-agents)
- [System Prompt Engineering](#system-prompt-engineering)
- [Best Practices](#best-practices)

## Overview

Penpot Wizard implements a **three-tier hierarchical agent system** powered by Vercel's AI SDK. This architecture enables complex, multi-step workflows while maintaining clear separation of concerns.

### Key Principles

1. **Single Responsibility**: Each agent has a focused domain
2. **Hierarchical Delegation**: Higher-level agents delegate to specialists
3. **Tool Composition**: Agents can use tools and other agents
4. **Streaming**: All agents support real-time streaming responses
5. **Cancellable**: Operations can be aborted mid-execution

### Agent Flow

```
USER MESSAGE
    ↓
DIRECTOR AGENT (user-facing)
├─ Identifies intent
├─ Elicits requirements
└─ Delegates to appropriate coordinator
    ↓
COORDINATOR AGENT (orchestrator)
├─ Validates brief
├─ Plans execution
└─ Sequences specialist calls
    ↓
SPECIALIZED AGENTS (executors)
├─ Domain experts
├─ Execute specific tasks
└─ Use tools and sub-agents
    ↓
TOOLS (atomic operations)
├─ Function tools
├─ RAG tools
├─ Drawing tools
└─ Image generation
```

## Agent Hierarchy

### Tier 1: Director Agents

**Purpose**: Single entry point for user interaction

**Characteristics**:
- User-facing conversational interface
- Identifies project types and intents
- Elicits requirements through dialogue
- Delegates to coordinators for execution
- Uses RAG tools for documentation queries
- Never performs specialist work directly

**Count**: Typically 1 primary director

**Example**: PenpotWizard

### Tier 2: Coordinator Agents

**Purpose**: Orchestrate multi-step project workflows

**Characteristics**:
- Not user-facing (called as tools by directors)
- Validate project briefs
- Plan and sequence work
- Call multiple specialists in order
- Maintain project state
- Report progress and results
- Structured output schemas

**Count**: One per project type (mobile, web, etc.)

**Example**: MobileProjectsCoordinator

### Tier 3: Specialized Agents

**Purpose**: Domain-specific expertise and execution

**Characteristics**:
- Focused on single domain (UI, UX, drawing, etc.)
- Wrapped as tools (callable by coordinators)
- Can have input/output schemas
- Can call other specialists (composition)
- Execute using available tools
- Return structured results

**Count**: Multiple per domain

**Examples**:
- UIDesignSpecialist
- UXDesignSpecialist
- ProjectPlanSpecialist
- MobileViewDesigner

### Tier 4: Image Generation Agents

**Purpose**: Generate images from text prompts

**Characteristics**:
- Specialized for image generation
- Wrapped as tools
- Return imageId for use in shapes
- Support multiple providers (DALL-E, Flux, etc.)

**Examples**:
- DALL-E 3
- Flux Pro
- Stable Diffusion

## Director Agents

### Definition Structure

**File**: `src/assets/directorAgents.ts`

```typescript
export interface DirectorAgent {
  id: string;                          // Unique identifier (kebab-case)
  name: string;                        // Display name
  description: string;                 // What this agent does
  system: string;                      // System prompt
  toolIds?: string[];                  // IDs of tools this agent can use
  specializedAgentIds?: string[];      // IDs of coordinators/specialists
  instance?: Agent<any, any, any>;     // AI SDK instance (auto-created)
  isUserCreated?: boolean;             // User-created flag
}

export const directorAgents: DirectorAgent[] = [
  {
    id: 'penpot-wizard',
    name: 'PenpotWizard',
    description: 'AI assistant for Penpot design projects',
    system: `...`, // System prompt
    toolIds: [
      'penpot-user-guide-rag',
      'get-user-data',
      'get-project-data'
    ],
    specializedAgentIds: [
      'mobile-projects-coordinator'
    ]
  }
];
```

### System Prompt Template

```typescript
system: `
<who_you_are>
  You are PenpotWizard, an AI assistant specialized in helping users
  create design projects in Penpot. You are friendly, professional,
  and always focused on delivering high-quality results.
</who_you_are>

<your_responsibilities>
  1. Identify Project Type
     - Determine if user wants mobile, web, or other project type
     - Ask clarifying questions when needed

  2. Elicit Requirements
     - Gather project name, purpose, target audience
     - Understand design preferences and constraints
     - Build complete project brief

  3. Answer Questions
     - Use penpotUserGuideRag tool to search documentation
     - Provide accurate, helpful answers about Penpot features

  4. Delegate Execution
     - Once brief is validated, delegate to appropriate coordinator
     - For mobile projects: call mobileProjectsCoordinator
     - For web projects: call webProjectsCoordinator (future)

  5. Report Progress
     - Keep user informed of progress
     - Explain what coordinators and specialists are doing
     - Present final results clearly
</your_responsibilities>

<what_you_do_not_do>
  - You do NOT perform specialist work (UI design, drawing, etc.)
  - You do NOT call drawing tools directly
  - You do NOT make design decisions without user input
  - You do NOT skip requirement gathering
</what_you_do_not_do>

<tools_available>
  - penpotUserGuideRag: Search Penpot documentation
  - getUserData: Get current user information
  - getProjectData: Get current project structure
  - mobileProjectsCoordinator: Execute mobile project workflows
</tools_available>

<workflow_example>
  User: "Create a login screen for my app"

  Step 1: Identify type → Mobile project
  Step 2: Elicit requirements:
    - What's the app name?
    - What's the target platform? (iOS/Android/Both)
    - Any specific design preferences?
    - What authentication methods? (email, social, etc.)

  Step 3: Build brief:
    {
      projectType: "mobile",
      projectName: "MyApp",
      platform: "iOS",
      brief: "Login screen with email/password and social auth..."
    }

  Step 4: Validate brief with user

  Step 5: Delegate to mobileProjectsCoordinator with brief

  Step 6: Report results to user
</workflow_example>

<language_rules>
  - Always respond in the same language as the user's message
  - Use professional, friendly tone
  - Be concise but thorough
</language_rules>
`
```

### Initialization

**File**: `src/stores/directorAgentsStore.ts`

```typescript
export function initializeDirectorAgents() {
  const allAgents = [
    ...directorAgents.map(a => ({ ...a, isUserCreated: false })),
    ...$userDirectorAgents.get().map(a => ({ ...a, isUserCreated: true }))
  ];

  const initialized = allAgents.map(agent => {
    // Get model
    const model = createModelInstance(
      $selectedLanguageModel.get(),
      getApiKey()
    );

    // Collect tools
    const tools = {};
    agent.toolIds?.forEach(id => {
      const tool = getToolById(id);
      if (tool?.instance) {
        tools[tool.name] = tool.instance;
      }
    });

    // Collect specialized agents (as tools)
    agent.specializedAgentIds?.forEach(id => {
      const specialist = getSpecializedAgentById(id);
      if (specialist?.instance) {
        tools[specialist.name] = specialist.instance;
      }
    });

    // Create agent instance
    const instance = createAgent({
      model,
      system: agent.system,
      tools
    });

    return { ...agent, instance };
  });

  $directorAgentsData.set(initialized);
}
```

## Coordinator Agents

### Definition Structure

**File**: `src/assets/coordinatorAgents.ts`

**Note**: Coordinators are implemented as SpecializedAgents

```typescript
export const coordinatorAgents: SpecializedAgent[] = [
  {
    id: 'mobile-projects-coordinator',
    name: 'mobileProjectsCoordinator',
    description: `
      Use this tool when the user has a validated project brief for a mobile application.

      This coordinator will:
      - Validate the brief is complete
      - Create a project plan with phases
      - Define the design system (colors, typography, spacing)
      - Define UX (screens, flows, states)
      - Execute drawing for each screen
      - Report completion with summary

      INPUT: Complete project brief with all requirements
      OUTPUT: Project completion summary with created artifacts
    `,
    system: `
      <who_you_are>
        You are the Mobile Projects Coordinator, responsible for orchestrating
        the complete execution of mobile app design projects from brief to
        final drawings in Penpot.
      </who_you_are>

      <your_role>
        You do NOT talk to end users. You are called as a tool by the
        director agent. Your job is to execute the project autonomously.
      </your_role>

      <execution_workflow>
        1. Validate Brief
           - Check all required fields present
           - If incomplete, return error requesting missing info

        2. Create Project Plan
           - Call projectPlanSpecialist with brief
           - Get phased delivery plan with acceptance criteria

        3. Define Design System
           - Call uiDesignSpecialist with brief
           - Get colors, typography, spacing, component styles

        4. Define UX Architecture
           - Call uxDesignSpecialist with brief
           - Get screens list, navigation flows, states

        5. Execute Drawing
           - For each screen from UX specialist:
             - Call mobileViewDesigner with:
               * Screen definition
               * Design system
               * Project brief
             - Verify screen created successfully

        6. Return Summary
           - List all created screens
           - Summarize design system used
           - Note any issues or recommendations
      </execution_workflow>

      <specialists_available>
        - projectPlanSpecialist: Creates phased project plan
        - uiDesignSpecialist: Defines design system
        - uxDesignSpecialist: Defines screens and flows
        - mobileViewDesigner: Draws screens in Penpot
      </specialists_available>

      <output_format>
        Return structured JSON:
        {
          success: boolean,
          screensCreated: string[],
          designSystem: object,
          summary: string,
          recommendations: string[]
        }
      </output_format>
    `,
    outputSchema: z.object({
      success: z.boolean(),
      screensCreated: z.array(z.string()),
      designSystem: z.object({
        colors: z.object({
          primary: z.string(),
          secondary: z.string(),
          background: z.string(),
          text: z.string()
        }),
        typography: z.object({
          headingFont: z.string(),
          bodyFont: z.string()
        })
      }),
      summary: z.string(),
      recommendations: z.array(z.string()).optional()
    }),
    toolIds: [],
    specializedAgentIds: [
      'project-plan-specialist',
      'ui-design-specialist',
      'ux-design-specialist',
      'mobile-view-designer'
    ]
  }
];
```

### Key Differences from Directors

| Aspect | Director | Coordinator |
|--------|----------|-------------|
| User-facing | ✅ Yes | ❌ No (called as tool) |
| Conversational | ✅ Yes | ❌ No (task-focused) |
| Elicits requirements | ✅ Yes | ❌ No (receives brief) |
| Output schema | ❌ No | ✅ Yes (structured) |
| Delegates to specialists | ✅ Yes | ✅ Yes |
| Maintains state | ✅ Conversation | ✅ Project state |

## Specialized Agents

### Definition Structure

**File**: `src/assets/specializedAgents.ts`

```typescript
export interface SpecializedAgent {
  id: string;                          // Unique ID (kebab-case)
  name: string;                        // Tool name (camelCase)
  description: string;                 // When to use this agent
  system: string;                      // System prompt
  inputSchema?: z.ZodObject<any>;      // Input schema (optional)
  outputSchema?: z.ZodObject<any>;     // Output schema (optional)
  toolIds?: string[];                  // Tools this agent can use
  specializedAgentIds?: string[];      // Other agents it can call
  instance?: CoreTool;                 // Tool instance (auto-created)
  agentInstance?: Agent<any, any, any>; // Underlying agent instance
  isUserCreated?: boolean;             // User-created flag
}
```

### Example: UI Design Specialist

```typescript
{
  id: 'ui-design-specialist',
  name: 'uiDesignSpecialist',
  description: `
    Use this tool to define a complete design system for a project.

    This specialist will analyze the project brief and create:
    - Color palette (primary, secondary, background, text colors)
    - Typography system (heading fonts, body fonts, sizes)
    - Spacing scale (margins, paddings, gaps)
    - Component styles (buttons, inputs, cards)
    - Design tokens

    INPUT: Project brief with requirements
    OUTPUT: Complete design system specification
  `,
  system: `
    <who_you_are>
      You are a UI Design Specialist with expertise in creating
      cohesive design systems, color theory, typography, and visual hierarchy.
    </who_you_are>

    <your_role>
      - Analyze project brief and target audience
      - Create appropriate color palettes
      - Select suitable typography
      - Define spacing and sizing scales
      - Ensure accessibility (WCAG compliance)
      - Return structured design system
    </your_role>

    <design_principles>
      1. Color Selection
         - Consider brand identity if provided
         - Ensure sufficient contrast (4.5:1 for text)
         - Create harmonious palettes
         - Include semantic colors (success, warning, error)

      2. Typography
         - Choose readable fonts
         - Define type scale (H1-H6, body, small)
         - Set line heights for readability
         - Consider platform (iOS/Android/Web)

      3. Spacing
         - Use consistent scale (4px, 8px, 16px, 24px, 32px, 48px)
         - Define component padding/margins
         - Ensure touch target sizes (minimum 44x44px)

      4. Components
         - Define button styles (primary, secondary, text)
         - Input field styles
         - Card styles
         - Navigation elements
    </design_principles>

    <tools_available>
      - getProjectData: Get current project fonts and colors
    </tools_available>

    <output_format>
      Return complete design system with all specifications.
      Include hex colors, font names, sizes in pixels/points.
    </output_format>
  `,
  outputSchema: z.object({
    colors: z.object({
      primary: z.string().describe('Primary brand color (hex)'),
      secondary: z.string().describe('Secondary color (hex)'),
      background: z.string().describe('Background color (hex)'),
      surface: z.string().describe('Surface/card color (hex)'),
      text: z.object({
        primary: z.string().describe('Primary text color (hex)'),
        secondary: z.string().describe('Secondary text color (hex)'),
        disabled: z.string().describe('Disabled text color (hex)')
      }),
      semantic: z.object({
        success: z.string(),
        warning: z.string(),
        error: z.string(),
        info: z.string()
      })
    }),
    typography: z.object({
      headingFont: z.string().describe('Font family for headings'),
      bodyFont: z.string().describe('Font family for body text'),
      scale: z.object({
        h1: z.number().describe('H1 size in px'),
        h2: z.number(),
        h3: z.number(),
        body: z.number(),
        small: z.number()
      }),
      lineHeight: z.object({
        tight: z.number(),
        normal: z.number(),
        relaxed: z.number()
      })
    }),
    spacing: z.object({
      scale: z.array(z.number()).describe('Spacing scale in px'),
      component: z.object({
        buttonPadding: z.string(),
        inputPadding: z.string(),
        cardPadding: z.string()
      })
    })
  }),
  toolIds: ['get-project-data'],
  specializedAgentIds: []
}
```

### Example: Mobile View Designer

```typescript
{
  id: 'mobile-view-designer',
  name: 'mobileViewDesigner',
  description: `
    Use this tool to draw a mobile screen/view in Penpot.

    This specialist will:
    - Create a board for the screen
    - Draw all UI elements (backgrounds, cards, buttons, text, icons)
    - Apply design system styles
    - Handle proper stacking order (backgrounds first, foreground last)
    - Generate images if needed

    IMPORTANT: Drawing order matters!
    - Backgrounds drawn FIRST (appear at bottom)
    - Foreground elements drawn LAST (appear on top)

    INPUT: Screen definition, design system, brief
    OUTPUT: Confirmation of screen creation
  `,
  system: `
    <who_you_are>
      You are a Mobile View Designer specialist. You execute drawing
      operations in Penpot to create actual visual designs.
    </who_you_are>

    <your_role>
      - Create boards for screens
      - Draw UI elements using drawing tools
      - Apply design system styles
      - Generate images when needed
      - Handle proper layering/stacking
    </your_role>

    <drawing_workflow>
      1. Create Board
         - Use boardMaker tool
         - Set appropriate size (375x812 for iPhone, 360x800 for Android)
         - Name it according to screen purpose

      2. Draw Background
         - Use rectangleMaker for screen background
         - Apply background color from design system
         - Full screen size

      3. Draw Background Elements
         - Header backgrounds
         - Card backgrounds
         - Decorative shapes

      4. Draw Foreground Elements
         - Text elements (headings, labels, body text)
         - Buttons
         - Input fields
         - Icons (use imageGenerator if needed)

      5. Apply Styles
         - Use colors from design system
         - Use typography from design system
         - Use spacing from design system
    </drawing_workflow>

    <stacking_order_critical>
      IMPORTANT: Penpot places newly drawn shapes BELOW existing ones!

      Therefore, draw in this order:
      1. Screen background (rectangleMaker) - will be at bottom
      2. Card backgrounds - on top of screen background
      3. Text elements - on top of cards
      4. Buttons - on top of everything

      DO NOT draw foreground elements first!
    </stacking_order_critical>

    <tools_available>
      - boardMaker: Create screen boards
      - rectangleMaker: Draw rectangles
      - ellipseMaker: Draw circles/ellipses
      - textMaker: Draw text
      - pathMaker: Draw custom shapes
      - imageGenerator: Generate images for icons/illustrations
    </tools_available>
  `,
  outputSchema: z.object({
    success: z.boolean(),
    screenName: z.string(),
    boardId: z.string(),
    elementsCreated: z.number(),
    summary: z.string()
  }),
  toolIds: [
    'board-maker',
    'rectangle-maker',
    'ellipse-maker',
    'text-maker',
    'path-maker'
  ],
  specializedAgentIds: ['image-generator']
}
```

### Wrapping as Tools

**File**: `src/stores/specializedAgentsStore.ts`

```typescript
function wrapSpecializedAgentAsTool(agent: SpecializedAgent): CoreTool {
  const model = createModelInstance(...);

  // Create agent instance
  const agentInstance = createAgent({
    model,
    system: agent.system,
    tools: collectToolsForAgent(agent)
  });

  // Wrap as tool
  const toolInstance = tool({
    description: agent.description,
    parameters: agent.inputSchema || z.object({
      query: z.string().describe('Query for the specialized agent')
    }),
    execute: async (params, { abortSignal }) => {
      // Convert params to message
      const query = agent.inputSchema
        ? JSON.stringify(params)
        : params.query;

      // Stream agent response
      const result = await agentInstance.stream({
        messages: [{ role: 'user', content: query }],
        abortSignal
      });

      // Process stream
      let finalResult = '';
      for await (const chunk of result) {
        if (chunk.type === 'text-delta') {
          finalResult += chunk.textDelta;
        }
        // Handle tool calls, etc.
      }

      // Parse output if schema defined
      if (agent.outputSchema) {
        return agent.outputSchema.parse(JSON.parse(finalResult));
      }

      return finalResult;
    }
  });

  return toolInstance;
}
```

## Image Generation Agents

### Definition Structure

**File**: `src/assets/imageGenerationAgents.ts`

```typescript
export interface ImageGenerationAgent {
  id: string;
  name: string;
  model: string;                       // Model ID (dall-e-3, flux-pro, etc.)
  description: string;
  sizes: string[];                     // Supported sizes
  instance?: CoreTool;
  isUserCreated?: boolean;
}

export const imageGenerationAgents: ImageGenerationAgent[] = [
  {
    id: 'image-generator',
    name: 'imageGenerator',
    model: 'dall-e-3',
    description: `
      Generate images from text prompts using DALL-E 3.

      Use this when you need:
      - Icons or illustrations
      - Background images
      - Decorative elements
      - Concept art

      Returns imageId that can be used as backgroundImage in shapes.
    `,
    sizes: ['1024x1024', '1792x1024', '1024x1792']
  }
];
```

### Initialization

```typescript
export function initializeImageGenerationAgents() {
  const initialized = imageGenerationAgents.map(agent => {
    const toolInstance = tool({
      description: agent.description,
      parameters: z.object({
        prompt: z.string().describe('Image generation prompt'),
        size: z.enum(agent.sizes as [string, ...string[]]).optional()
      }),
      execute: async ({ prompt, size }) => {
        // Generate image
        const imageUrl = await generateImage(agent.model, prompt, size);

        // Upload to Penpot
        const response = await sendMessageToPlugin(
          ClientQueryType.ADD_IMAGE,
          {
            name: `generated-${Date.now()}`,
            imageUrl
          }
        );

        if (!response.success) {
          throw new Error('Failed to upload image to Penpot');
        }

        return {
          imageId: response.data.imageId,
          prompt,
          size: size || agent.sizes[0]
        };
      }
    });

    return { ...agent, instance: toolInstance };
  });

  $imageGenerationAgentsData.set(initialized);
}
```

## Agent Communication

### Nested Streaming

When a director calls a coordinator, and the coordinator calls specialists:

```
Director streams
  ↓
  Chunk: tool-call (coordinator)
    ↓
    Coordinator streams (nested)
      ↓
      Chunk: tool-call (specialist)
        ↓
        Specialist streams (nested)
          ↓
          Chunk: tool-call (drawing tool)
          Chunk: tool-result
      ↓
      Chunk: tool-result
  ↓
  Chunk: tool-result
↓
Final response
```

### Abort Signal Propagation

All nested agents share the same AbortSignal:

```typescript
// Director level
const abortController = new AbortController();

await directorAgent.stream({
  messages,
  abortSignal: abortController.signal  // Passed to all nested calls
});

// User clicks cancel
abortController.abort();  // Cancels all nested operations
```

## Creating Custom Agents

### 1. Create Director

Add to `src/assets/directorAgents.ts`:

```typescript
{
  id: 'my-custom-director',
  name: 'MyCustomDirector',
  description: 'Description of what this director does',
  system: `<who_you_are>...</who_you_are>`,
  toolIds: ['tool-1', 'tool-2'],
  specializedAgentIds: ['specialist-1']
}
```

### 2. Create Coordinator

Add to `src/assets/coordinatorAgents.ts`:

```typescript
{
  id: 'my-coordinator',
  name: 'myCoordinator',
  description: 'When to use this coordinator...',
  system: `<execution_workflow>...</execution_workflow>`,
  outputSchema: z.object({
    success: z.boolean(),
    result: z.string()
  }),
  specializedAgentIds: ['specialist-1', 'specialist-2']
}
```

### 3. Create Specialist

Add to `src/assets/specializedAgents.ts`:

```typescript
{
  id: 'my-specialist',
  name: 'mySpecialist',
  description: 'What this specialist does...',
  system: `<your_role>...</your_role>`,
  outputSchema: z.object({...}),
  toolIds: ['tool-1'],
  specializedAgentIds: []
}
```

## System Prompt Engineering

### Template Structure

```xml
<who_you_are>
  Clear identity and role definition
</who_you_are>

<your_responsibilities>
  1. Responsibility 1
  2. Responsibility 2
  3. Responsibility 3
</your_responsibilities>

<what_you_do_not_do>
  - Explicit limitations
  - Out of scope tasks
</what_you_do_not_do>

<tools_available>
  - tool1: Description
  - tool2: Description
</tools_available>

<workflow>
  Step-by-step execution process
</workflow>

<output_format>
  How to structure responses
</output_format>

<language_rules>
  Communication guidelines
</language_rules>
```

### Best Practices

**DO:**
- ✅ Be specific about capabilities
- ✅ Define clear workflows
- ✅ List available tools
- ✅ Include examples
- ✅ Specify output format
- ✅ Define limitations
- ✅ Use XML tags for structure

**DON'T:**
- ❌ Be vague or generic
- ❌ Make prompts too long (>2000 tokens)
- ❌ Forget language handling
- ❌ Skip edge case handling
- ❌ Ignore error scenarios

---

**Next**: See [TOOLS_SYSTEM.md](./TOOLS_SYSTEM.md) for tools creation guide and [PLUGIN_COMMUNICATION.md](./PLUGIN_COMMUNICATION.md) for plugin integration details.
