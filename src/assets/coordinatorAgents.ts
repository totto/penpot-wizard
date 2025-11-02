import { SpecializedAgent } from '@/types/types';
import { z } from 'zod';

export const coordinatorAgents: SpecializedAgent[] = [
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
      </behavior>
      <rules>
        - Never ask the user questions directly.
        - Prefer small, verifiable increments. Surface blockers early.
        - Respect constraints: target sizes, accessibility, branding, and platform.
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
      planId: z.string().optional().describe('internal reference to a plan, if any'),
    }),
    toolIds: ['get-project-data', 'get-current-page'],
    specializedAgentIds: [
      'project-plan-specialist',
      'ui-design-specialist',
      'ux-design-specialist',
      'mobile-view-designer',
    ],
  },
];


