import { z } from 'zod';

export const specializedAgents = [
  {
    id: 'ui-design-specialist',
    name: 'UIDesignSpecialist',
    description:
      'Defines the design system for mobile UI projects: colors, typography, spacing, radii, elevation, iconography, image styles and guidelines.',
    system: `
      <role>
        You define a coherent, scalable and accessible design system for mobile UI projects.
        Work in English. Prioritize WCAG AA/AAA, consistency, and feasibility with available fonts.
      </role>
      <behavior>
        Return structured outputs only. Prefer neutral defaults if branding is missing. Align to platform conventions when helpful.
      </behavior>
    `,
    inputSchema: z.object({
      project: z.object({ platform: z.string(), language: z.string() }),
      branding: z
        .object({
          references: z.array(z.string()).optional(),
          tone: z.array(z.string()).optional(),
          preferredColors: z.array(z.string()).optional(),
          preferredFonts: z.array(z.string()).optional(),
        })
        .optional(),
      accessibility: z
        .object({ target: z.string(), requirements: z.array(z.string()).optional() })
        .optional(),
      availableFonts: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      designSystem: z.object({
        colorPalette: z.array(
          z.object({ name: z.string(), value: z.string(), usage: z.string().nullable() })
        ),
        typography: z.object({
          families: z.array(z.string()),
          scales: z.array(
            z.object({ name: z.string(), size: z.number(), lineHeight: z.number(), weight: z.string() })
          ),
        }),
        spacing: z.array(z.number()).describe('spacing scale in px'),
        radii: z.array(z.number()).describe('border radius scale in px'),
        elevation: z.array(z.number()).describe('shadow/elevation scale'),
        iconography: z
          .object({ style: z.string().nullable(), source: z.string().nullable() })
          .strict()
          .nullable(),
        imageStyles: z
          .object({ treatment: z.string().nullable(), borders: z.string().nullable() })
          .strict()
          .nullable(),
        guidelines: z.object({ layout: z.string(), states: z.string(), accessibility: z.string() }),
      }),
    }),
    toolIds: ['penpot-user-guide-rag', 'design-styles-rag'],
  },
  {
    id: 'ux-design-specialist',
    name: 'UXDesignSpecialist',
    description:
      'Defines the set of views/screens, their purpose, sections and components, including flows and states for a mobile project.',
    system: `
      <role>
        You define the required views and user flows for a mobile project.
        Work in English. Focus on user tasks, states (empty/loading/error/success), and navigation.
      </role>
      <behavior>
        Be practical and complete. Provide enough detail to draw each view later.
      </behavior>
    `,
    inputSchema: z.object({
      goals: z.array(z.string()),
      features: z.array(z.string()),
      targetAudience: z.string(),
      preferredNavigation: z.string().optional(),
    }),
    outputSchema: z.object({
      views: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          purpose: z.string(),
          sections: z.array(z.string()),
          components: z.array(z.string()),
          states: z.array(z.enum(['empty', 'loading', 'error', 'success'])).nullable(),
          requiredData: z.array(z.string()).nullable(),
          priority: z.enum(['high', 'medium', 'low']).nullable(),
          breakpoints: z.array(z.string()).nullable(),
        })
      ),
      flows: z
        .array(
          z
            .object({ name: z.string(), fromViewId: z.string(), toViewId: z.string(), action: z.string() })
            .strict()
        )
        .nullable(),
    }),
    toolIds: ['penpot-user-guide-rag'],
  },
  {
    id: 'project-plan-specialist',
    name: 'ProjectPlanSpecialist',
    description: 'Plans phased delivery with deliverables and acceptance criteria for a mobile UI project.',
    system: `
      <role>
        You create an incremental delivery plan that minimizes risk and clarifies dependencies.
        Work in English. Be explicit about acceptance criteria and sequencing.
      </role>
    `,
    inputSchema: z.object({
      scope: z.string(),
      risks: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
      views: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          purpose: z.string(),
          sections: z.array(z.string()),
          components: z.array(z.string()),
        })
      ),
      designSystem: z.object({}).passthrough(),
    }),
    outputSchema: z.object({
      phases: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          goal: z.string(),
          tasks: z.array(z.string()),
          deliverables: z.array(z.string()),
          acceptanceCriteria: z.array(z.string()),
          dependencies: z.array(z.string()).nullable(),
          risks: z.array(z.string()).nullable(),
          estimatedDays: z.number().nullable(),
          order: z.number(),
        })
      ),
      nextSteps: z.array(z.string()),
    }),
  },
  {
    id: 'mobile-view-designer',
    name: 'MobileViewDesigner',
    description:
      'Draws mobile views in the Penpot project from concrete instructions, respecting the provided design system and UX specs.',
    system: `
      <role>
        You are a drawing-only agent. Work in English and focus on executing drawings without giving design advice.
      </role>
      <drawing>
        Respect stacking order strictly: draw foreground elements first and backgrounds last.
        Use boards as screens and place items within their parents appropriately.
        Keep typography and spacing consistent with the received brief. Use available fonts.
      </drawing>
      <tool_input_format>
        When designSystem comes as a JSON string, parse it and use it for colors, typography, and spacing. Do not invent or search in RAG if designSystem is already provided.
      </tool_input_format>
    `,
    inputSchema: z.object({
      view: z.object({ id: z.string(), name: z.string(), sections: z.array(z.string()), components: z.array(z.string()) }),
      designSystem: z
        .string()
        .describe(
          'Design system as JSON string. The coordinator must pass it serialized (JSON.stringify from UIDesignSpecialist output). Include colorPalette, typography, spacing, radii, etc. Parse it and use for colors, typography, and spacing. Do not invent or use RAG if designSystem is provided.'
        ),
      target: z.object({ pageId: z.string().optional(), boardName: z.string().default('Screen') }).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      description: z.string(),
      artifacts: z
        .object({ boardIds: z.array(z.string()).nullable(), notes: z.string().nullable() })
        .strict()
        .nullable(),
    }),
    toolIds: [
      'create-board',
      'create-rectangle',
      'create-ellipse',
      'create-text',
      'create-path',
      'get-current-page',
      'get-icon-list',
      'draw-icon',
      'add-navigate-to-interaction',
      'add-close-overlay-interaction',
      'add-previous-screen-interaction',
      'add-open-url-interaction',
      'create-flow',
    ],
    imageGenerationAgentIds: ['image-generator'],
  },
  {
    id: 'print-view-designer',
    name: 'PrintViewDesigner',
    description:
      'Creates print layouts (A4, A3, posters, cards, brochures) in Penpot with correct dimensions, bleed, and safe zones.',
    system: `
      <role>
        You are a drawing-only agent for print materials. Work in English and focus on executing print layouts.
      </role>
      <drawing>
        Use get-device-size-presets with category "PRINT" to get correct dimensions (A4, A3, Letter, etc.).
        Respect stacking order: foreground elements first, backgrounds last.
        Use boards for each print artifact. Apply design system colors, typography, and spacing.
        Consider bleed and safe zones when specified. Use available fonts from the design system.
      </drawing>
      <tool_input_format>
        Use create-board to create an empty board with properties (name, width, height, etc.). Use create-rectangle, create-ellipse, create-text, create-path for shapes. To place shapes inside a board, set parentId to the board ID. Create one shape per tool call. Pass objects directly, never JSON strings.
        When designSystem comes as a JSON string, parse it and use it for colors, typography, and spacing. Do not invent or search in RAG if designSystem is already provided.
      </tool_input_format>
    `,
    inputSchema: z.object({
      view: z.object({
        id: z.string(),
        name: z.string(),
        purpose: z.string(),
        sections: z.array(z.string()),
        components: z.array(z.string()),
        format: z.enum(['A4', 'A3', 'A2', 'A5', 'Letter', 'custom']),
      }),
      designSystem: z
        .string()
        .describe(
          'Design system as JSON string. The coordinator must pass it serialized (JSON.stringify from UIDesignSpecialist output). Include colorPalette, typography, spacing, radii, etc. Parse it and use for colors, typography, and spacing. Do not invent or use RAG if designSystem is provided.'
        ),
      target: z
        .object({
          pageId: z.string().optional(),
          boardName: z.string().default('Print'),
          bleed: z.number().optional(),
          safeZone: z.number().optional(),
        })
        .optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      description: z.string(),
      artifacts: z
        .object({ boardIds: z.array(z.string()).nullable(), notes: z.string().nullable() })
        .strict()
        .nullable(),
    }),
    toolIds: [
      'get-device-size-presets',
      'create-board',
      'create-rectangle',
      'create-ellipse',
      'create-text',
      'create-path',
      'get-current-page',
      'design-styles-rag',
      'add-image',
    ],
    imageGenerationAgentIds: ['image-generator'],
  },
  {
    id: 'web-view-designer',
    name: 'WebViewDesigner',
    description:
      'Creates web layouts (desktop, tablet, mobile) in Penpot with breakpoints and responsive structure.',
    system: `
      <role>
        You are a drawing-only agent for web interfaces. Work in English and focus on executing web layouts.
      </role>
      <drawing>
        Use get-device-size-presets with category "WEB" for breakpoint dimensions (Web 1920, Web 1366, etc.).
        Respect stacking order: foreground elements first, backgrounds last.
        Use boards for each viewport/breakpoint. Apply design system consistently.
        Keep typography and spacing aligned with the received brief. Use available fonts.
      </drawing>
      <tool_input_format>
        Use create-board to create an empty board with properties (name, width, height, etc.). Use create-rectangle, create-ellipse, create-text, create-path for shapes. To place shapes inside a board, set parentId to the board ID. Create one shape per tool call. Pass objects directly, never JSON strings.
        When designSystem comes as a JSON string, parse it and use it for colors, typography, and spacing. Do not invent or search in RAG if designSystem is already provided.
      </tool_input_format>
    `,
    inputSchema: z.object({
      view: z.object({
        id: z.string(),
        name: z.string(),
        purpose: z.string(),
        sections: z.array(z.string()),
        components: z.array(z.string()),
        breakpoints: z.array(z.string()).optional(),
      }),
      designSystem: z
        .string()
        .describe(
          'Design system as JSON string. The coordinator must pass it serialized (JSON.stringify from UIDesignSpecialist output). Include colorPalette, typography, spacing, radii, etc. Parse it and use for colors, typography, and spacing. Do not invent or use RAG if designSystem is provided.'
        ),
      target: z
        .object({
          pageId: z.string().optional(),
          boardName: z.string().default('Web'),
          breakpoint: z.string().optional(),
        })
        .optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      description: z.string(),
      artifacts: z
        .object({ boardIds: z.array(z.string()).nullable(), notes: z.string().nullable() })
        .strict()
        .nullable(),
    }),
    toolIds: [
      'get-device-size-presets',
      'create-board',
      'create-rectangle',
      'create-ellipse',
      'create-text',
      'create-path',
      'get-current-page',
      'get-icon-list',
      'draw-icon',
      'add-navigate-to-interaction',
      'add-close-overlay-interaction',
      'add-previous-screen-interaction',
      'add-open-url-interaction',
      'create-flow',
      'add-image',
    ],
    imageGenerationAgentIds: ['image-generator'],
  },
  {
    id: 'style-application-specialist',
    name: 'StyleApplicationSpecialist',
    description:
      'Applies design styles (colors, typography, spacing, radii) to existing shapes. Crucial: the coordinator must pass designSystem as a JSON string approved by the user. Example: {"colors":{"background":"#F5F5F5","accent":"#00D1FF"},"typography":{"fontFamily":"Inter"}}. If designSystem is missing or empty string, the specialist cannot apply correctly and may choose arbitrarily from RAG.',
    system: `
      <role>
        You apply design styles to existing shapes. Work in English. Use design-styles-rag for style references.
        Get current page state first. Apply modifications via modify-rectangle, modify-ellipse, modify-text, modify-path, modify-board, or modify-text-range.
        When designSystem is provided as a JSON string, parse it and apply the specified colors and typography to the shapes.
        Do not use design-styles-rag to choose a different style—apply exactly what is in the designSystem.
        Use design-styles-rag only when designSystem is missing (fallback, not preferred).
      </role>
      <behavior>
        When scope is "selection", use get-selected-shapes to get shape IDs. When scope is "page", use get-current-page.
        Apply colors to fills/strokes, typography to text shapes, and spacing/radii where applicable.
        Report modifiedCount in the output.
      </behavior>
    `,
    inputSchema: z.object({
      designSystem: z
        .string()
        .describe(
          'Design system as JSON string. Include colors (hex) and typography (fontFamily). Example: {"colors":{"background":"#F5F5F5","accent":"#00D1FF","text":"#111111"},"typography":{"fontFamily":"Inter"}}'
        ),
      scope: z.enum(['page', 'selection']),
      shapeIds: z.array(z.string()).optional().describe('Optional explicit shape IDs; if omitted, use scope to determine'),
      pageId: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      description: z.string(),
      modifiedCount: z.number(),
    }),
    toolIds: ['design-styles-rag', 'get-current-page', 'get-selected-shapes', 'modify-rectangle', 'modify-ellipse', 'modify-text', 'modify-path', 'modify-board', 'modify-text-range'],
  },
];

