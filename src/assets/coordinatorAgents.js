import { z } from 'zod';

export const coordinatorAgents = [
  {
    id: 'mobile-projects-coordinator',
    name: 'MobileProjectsCoordinator',
    description:
      'Orchestrates mobile UI design projects for apps/webapps on mobile devices. Validates the brief, coordinates specialists, and returns progress with next steps.',
    system: `
      <role>
        You coordinate internal specialists to deliver mobile UI projects end-to-end in Penpot.
        You do not talk to the end user. Work in English and return concise progress updates and clear next steps.
      </role>
      <behavior>
        Receive a structured brief (see input schema). Validate completeness, then sequence internal calls:
        planning → design system → UX views/flows → drawing per view.
        Maintain state and report what is done and what comes next. Keep outputs actionable.
        When calling MobileViewDesigner, pass the designSystem received from UIDesignSpecialist as a JSON string: use JSON.stringify(designSystem) on the output. Never omit or pass an empty designSystem when calling MobileViewDesigner.
      </behavior>
      <rules>
        - Never ask the user questions directly.
        - Prefer small, verifiable increments. Surface blockers early.
        - Respect constraints: target sizes, accessibility, branding, and platform.
        - Pass designSystem to MobileViewDesigner as JSON string (JSON.stringify). Never omit it when UIDesignSpecialist has produced it.
      </rules>
    `,
    inputSchema: z.object({
      project: z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        goals: z.array(z.string()).min(1),
        scope: z.enum(['MVP', 'Full', 'Iterative']).default('MVP'),
        platform: z.enum(['iOS', 'Android', 'Both', 'PWA']).default('Both'),
        targetAudience: z.string().min(1),
        keyUseCases: z.array(z.string()).min(1),
        keyFeatures: z.array(z.string()).min(1),
        preferredNavigation: z.enum(['tabs', 'drawer', 'stack', 'mixed']).optional(),
        branding: z
          .object({
            hasGuide: z.boolean().default(false),
            references: z.array(z.string()).optional(),
            tone: z
              .array(
                z.enum([
                  'minimal',
                  'vibrant',
                  'neutral',
                  'dark',
                  'illustrated',
                  'photographic',
                ])
              )
              .optional(),
            preferredColors: z.array(z.string()).optional(),
            preferredFonts: z.array(z.string()).optional(),
          })
          .optional(),
        accessibility: z
          .object({
            target: z.enum(['AA', 'AAA', 'N/A']).default('AA'),
            requirements: z.array(z.string()).optional(),
          })
          .optional(),
        targetSizes: z
          .array(
            z.enum([
              'iPhone-13',
              'iPhone-15-Pro',
              'Pixel-7',
              'Generic-Android',
              'Tablet-portrait',
            ])
          )
          .default(['iPhone-13']),
        language: z.enum(['en', 'es']).default('en'),
        constraints: z.array(z.string()).optional(),
        deliverables: z
          .array(z.enum(['prototype', 'library', 'iconography', 'main-flow']))
          .default(['prototype']),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('overall success'),
      summary: z.string().describe('what was done and current status'),
      nextSteps: z.array(z.string()).describe('ordered next actions'),
      planId: z.string().nullable().describe('internal reference to a plan, if any'),
    }),
    toolIds: ['get-project-data', 'get-current-page'],
    specializedAgentIds: [
      'project-plan-specialist',
      'ui-design-specialist',
      'ux-design-specialist',
      'mobile-view-designer',
    ],
  },
  {
    id: 'print-projects-coordinator',
    name: 'PrintProjectsCoordinator',
    description:
      'Orchestrates print design projects (posters, cards, brochures, flyers). Validates the brief, coordinates specialists, and returns progress with next steps.',
    system: `
      <role>
        You coordinate internal specialists to deliver print design projects end-to-end in Penpot.
        You do not talk to the end user. Work in English and return concise progress updates and clear next steps.
      </role>
      <behavior>
        Receive a structured brief (see input schema). Validate completeness, then sequence internal calls:
        planning → design system → print layout per artifact.
        Maintain state and report what is done and what comes next. Keep outputs actionable.
        When calling PrintViewDesigner, pass the designSystem received from UIDesignSpecialist as a JSON string: use JSON.stringify(designSystem) on the output. Never omit or pass an empty designSystem when calling PrintViewDesigner.
      </behavior>
      <rules>
        - Never ask the user questions directly.
        - Prefer small, verifiable increments. Surface blockers early.
        - Use PRINT category in get-device-size-presets for formats (A4, A3, etc.).
        - Respect print constraints: bleed, safe zone, color mode (RGB for screen preview).
        - Pass designSystem to PrintViewDesigner as JSON string (JSON.stringify). Never omit it when UIDesignSpecialist has produced it.
      </rules>
    `,
    inputSchema: z.object({
      project: z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        usage: z.enum(['poster', 'card', 'brochure', 'flyer', 'letterhead', 'social-media', 'custom']),
        format: z.enum(['A4', 'A3', 'A2', 'A5', 'A6', 'Letter', 'custom']).default('A4'),
        customDimensions: z
          .object({ width: z.number(), height: z.number() })
          .optional()
          .describe('Required when format is custom'),
        bleed: z.number().optional(),
        safeZone: z.number().optional(),
        content: z.array(z.string()).optional().describe('Main content sections or copy'),
        branding: z
          .object({
            hasGuide: z.boolean().default(false),
            preferredColors: z.array(z.string()).optional(),
            preferredFonts: z.array(z.string()).optional(),
          })
          .optional(),
        deliverables: z.array(z.string()).default(['layout']),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('overall success'),
      summary: z.string().describe('what was done and current status'),
      nextSteps: z.array(z.string()).describe('ordered next actions'),
      planId: z.string().nullable().describe('internal reference to a plan, if any'),
    }),
    toolIds: ['get-project-data', 'get-current-page', 'get-device-size-presets'],
    specializedAgentIds: ['project-plan-specialist', 'ui-design-specialist', 'print-view-designer'],
  },
  {
    id: 'web-projects-coordinator',
    name: 'WebProjectsCoordinator',
    description:
      'Orchestrates web design projects (landing pages, web apps, dashboards). Validates the brief, coordinates specialists, and returns progress with next steps.',
    system: `
      <role>
        You coordinate internal specialists to deliver web design projects end-to-end in Penpot.
        You do not talk to the end user. Work in English and return concise progress updates and clear next steps.
      </role>
      <behavior>
        Receive a structured brief (see input schema). Validate completeness, then sequence internal calls:
        planning → design system → UX views/flows → drawing per view/breakpoint.
        Maintain state and report what is done and what comes next. Keep outputs actionable.
        When calling WebViewDesigner, pass the designSystem received from UIDesignSpecialist as a JSON string: use JSON.stringify(designSystem) on the output. Never omit or pass an empty designSystem when calling WebViewDesigner.
      </behavior>
      <rules>
        - Never ask the user questions directly.
        - Prefer small, verifiable increments. Surface blockers early.
        - Use WEB category in get-device-size-presets for breakpoints (Web 1920, Web 1366, etc.).
        - Respect breakpoints: desktop, tablet, mobile as specified.
        - Pass designSystem to WebViewDesigner as JSON string (JSON.stringify). Never omit it when UIDesignSpecialist has produced it.
      </rules>
    `,
    inputSchema: z.object({
      project: z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        type: z.enum(['landing', 'app', 'dashboard', 'marketing', 'custom']).default('landing'),
        goals: z.array(z.string()).min(1),
        targetAudience: z.string().min(1),
        keyFeatures: z.array(z.string()).min(1),
        breakpoints: z
          .array(z.enum(['desktop', 'tablet', 'mobile']))
          .default(['desktop', 'tablet', 'mobile']),
        targetSizes: z
          .array(z.string())
          .optional()
          .describe('e.g. Web-1920, Web-1366, Web-1280'),
        branding: z
          .object({
            hasGuide: z.boolean().default(false),
            preferredColors: z.array(z.string()).optional(),
            preferredFonts: z.array(z.string()).optional(),
          })
          .optional(),
        accessibility: z
          .object({
            target: z.enum(['AA', 'AAA', 'N/A']).default('AA'),
            requirements: z.array(z.string()).optional(),
          })
          .optional(),
        deliverables: z.array(z.string()).default(['prototype']),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('overall success'),
      summary: z.string().describe('what was done and current status'),
      nextSteps: z.array(z.string()).describe('ordered next actions'),
      planId: z.string().nullable().describe('internal reference to a plan, if any'),
    }),
    toolIds: ['get-project-data', 'get-current-page', 'get-device-size-presets'],
    specializedAgentIds: [
      'project-plan-specialist',
      'ui-design-specialist',
      'ux-design-specialist',
      'web-view-designer',
    ],
  },
  {
    id: 'style-advisor-coordinator',
    name: 'StyleAdvisorCoordinator',
    description:
      'Provides design style advice and applies styles to existing projects. Can advise on palette, typography, spacing, or directly apply styles to shapes.',
    system: `
      <role>
        You coordinate internal specialists to advise on or apply design styles in Penpot.
        You do not talk to the end user. Work in English and return concise recommendations or application results.
        Your main role is to receive the brief from the director (which comes from the user) and pass it to the specialist.
        You coordinate; you do not design. The director defines the design with user approval; you transmit it to the specialist.
      </role>
      <behavior>
        Receive a structured brief (see input schema). When scope is "advise", use UIDesignSpecialist and design-styles-rag
        to produce recommendations. When scope is "apply", use StyleApplicationSpecialist to modify shapes.
        designSystem arrives as a JSON string; pass it to StyleApplicationSpecialist exactly as received (do not modify or parse it).
        Pass shapeIds, pageId, and scope as well. Only expand or infer when strictly necessary and deducible without asking the user.
        Return structured output with recommendations or modifiedCount.
      </behavior>
      <rules>
        - Never ask the user questions directly.
        - For advise: return palette, typography, spacing, radii recommendations.
        - For apply: get current page/shapes first, then pass designSystem (JSON string) to StyleApplicationSpecialist—never invent or omit it.
        - designSystem is a JSON string that must be passed unchanged; the specialist needs the user-approved design to apply correctly.
      </rules>
    `,
    inputSchema: z.object({
      scope: z.enum(['advise', 'apply']),
      pageId: z.string().optional(),
      shapeIds: z.array(z.string()).optional(),
      stylePreferences: z
        .object({
          tone: z.array(z.string()).optional(),
          reference: z.string().optional(),
          preferredColors: z.array(z.string()).optional(),
          preferredFonts: z.array(z.string()).optional(),
        })
        .optional(),
      designSystem: z
        .string()
        .optional()
        .describe(
          'Required when scope is apply. The design system as a JSON string. The director must serialize the approved palette and typography. Example: {"colors":{"background":"#F5F5F5","accent":"#00D1FF","text":"#111111"},"typography":{"fontFamily":"Inter"}}'
        ),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('overall success'),
      summary: z.string().describe('recommendations or application result'),
      nextSteps: z.array(z.string()).describe('ordered next actions'),
      planId: z.string().nullable().optional(),
      recommendations: z
        .object({
          colorPalette: z.array(z.any()).optional(),
          typography: z.any().optional(),
          spacing: z.any().optional(),
          radii: z.any().optional(),
        })
        .optional(),
      modifiedCount: z.number().optional(),
    }),
    toolIds: ['get-project-data', 'get-current-page', 'get-selected-shapes'],
    specializedAgentIds: ['ui-design-specialist', 'style-application-specialist'],
  },
];


