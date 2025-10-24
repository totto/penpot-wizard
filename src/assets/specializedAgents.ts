import { SpecializedAgent } from '@/types/types';
import { z } from 'zod';

export const specializedAgents: SpecializedAgent[] = [
  {
    id: "ui-delivery-coordinator",
    name: "UIDeliveryCoordinator",
    description: `Orchestrates UI project delivery: validates brief, defines phases, coordinates analysis, design language and screen execution; returns progress and next steps.`,
    system: `
      <role>
        You coordinate internal specialized agents to deliver interface projects.
        You do not speak with the end user. Work in English and return concise progress summaries and next steps.
      </role>
      <behavior>
        Receive a consolidated brief; plan and sequence internal calls (analysis → design language → screen execution).
      </behavior>
    `,
    outputSchema: z.object({
      success: z.boolean().describe('success'),
      description: z.string().describe('what was done and current status'),
      plan: z.string().optional().describe('next steps or execution plan')
    }),
    toolIds: ["get-project-data", "get-available-fonts", "get-current-page"],
    specializedAgentIds: ["product-ui-analyst", "design-language-lead", "screen-layout-designer"],
    imageGenerationAgentIds: ["image-generator"],
  },
  {
    id: "product-ui-analyst",
    name: "ProductUiAnalyst",
    description: `
      Analyzes the project and produces:
      - recommended design approach
      - a list of screens/views with descriptions
      - a step-by-step execution plan.
    `,
    system: `
      <role>
        You analyze interface projects and produce a clear, actionable document.
        Work in English and optimize for structure, completeness and feasibility.
      </role>
    `,
    outputSchema: z.object({
      projectAnalysis: z.object({
        analysis: z.string().describe('recommended design approach and rationale'),
        views: z.string().describe('list of views/screens with purpose and content'),
        stepByStepPlan: z.string().describe('ordered plan to build the project')
      })
    }),
    toolIds: ["penpot-user-guide-rag"],
    specializedAgentIds: [],
  },
  {
    id: "design-language-lead",
    name: "DesignLanguageLead",
    description: `
      Defines the design language: color palette, base typography and UI/UX guidelines;
      can suggest visual assets if helpful.
    `,
    system: `
      <role>
        You specify a coherent design language for the project.
        Work in English and ensure accessibility, consistency and applicability to prototypes.
      </role>
    `,
    outputSchema: z.object({
      designSystem: z.object({
        colorPalette: z.string().describe('final color palette and usage notes'),
        typography: z.string().describe('font families, sizes, weights and pairing'),
        guidelines: z.string().describe('layout, spacing, states, components, accessibility')
      })
    }),
    toolIds: ["penpot-user-guide-rag", "get-available-fonts"],
    imageGenerationAgentIds: ["image-generator"],
    specializedAgentIds: [],
  },
  {
    id: "screen-layout-designer",
    name: "ScreenLayoutDesigner",
    description: `
      Executes screen/view designs in the Penpot project from concrete instructions.
      Draws precisely and respects visual hierarchy; returns a brief summary of what was created.
      *IMPORTANT FOR YOUR QUERIES* Always provide context to better understand the project. Add analysis, views, color palette, typography and guidelines.
    `,
    system: `
      <role>
        You are a drawing-only agent. Work in English and focus solely on executing drawings without giving design advice.
      </role>
      <drawing>
        Respect stacking order strictly: draw foreground elements first and backgrounds last.
        Organize content with boards and place items within their parents appropriately.
        Keep typography and spacing consistent with the received brief.
      </drawing>
    `,
    inputSchema: z.object({
      designSystem: z.string().describe('design system to use'),
      projectAnalysis: z.string().describe('project analysis')
    }),
    outputSchema: z.object({
      success: z.boolean().describe('success'),
      description: z.string().describe('what you created')
    }),
    toolIds: ["board-maker", "rectangle-maker", "ellipse-maker", "path-maker", "text-maker", "get-current-page"],
    imageGenerationAgentIds: ["image-generator"],
    specializedAgentIds: [],
  }
];

