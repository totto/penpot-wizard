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
    toolIds: ['penpot-user-guide-rag', 'get-available-fonts'],
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
    `,
    inputSchema: z.object({
      view: z.object({ id: z.string(), name: z.string(), sections: z.array(z.string()), components: z.array(z.string()) }),
      designSystem: z.object({}).passthrough(),
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
      'create-shapes',
      'get-current-page',
    ],
    imageGenerationAgentIds: ['image-generator'],
  },
];

