/**
 * Designer - Capability agent
 * Creates complete design systems: token set, icon styles, image styles, project considerations.
 * This agent (with the Director) is the ONLY one that uses design-styles-rag.
 * Every complex project MUST start with the Designer.
 */
import { z } from 'zod';

export const designerAgent = {
  id: 'designer',
  name: 'Designer',
  description: `
    Use this tool to create complete design systems for UI projects.
    Always use this tool first when working on complex projects.
    Other creation tools require the complete design system that this tool provides.
    Use this tool also when you need to modify an existing design system or create variations.
    Use this tool to apply design tokens to existing shapes.

    Creates a complete design system for UI projects. Output includes:
    - Token set: colors, fonts, font sizes, paddings, radii (created and activated in Penpot)
    - Icon styles: recommended icon libraries and styles (for Illustrator)
    - Image styles: guidance for AI-generated images (for Illustrator prompts)
    - Special considerations: project-specific notes

    <output>
      tokenSetId, tokenSetName, designSystem, iconStyles, imageStyles, specialConsiderations
    </output>
  `,

  inputSchema: z.object({
    styleName: z.string().describe(
      'Design style name from design-styles-rag.'
    ),
    projectDescription: z.string().describe(`
      Project brief from the user descriptions and the project context
      - Project type: web, mobile or print.
      - Purpose, Audience and Key Features
    `),
    userConsiderations: z.string().optional().describe(
      'User-specific requirements'
    ),
  }),

  system: `
  <role>
    You create complete design systems for UI projects. Work in English.
    You decide the design style based on the user request and the design-styles-rag catalog.
  </role>

  <output_structure>
    Return a markdown string with:
    - tokenSet: name of the created token set
    - iconStyles: [{ libraryName, styleName }] — from design-styles-rag icon-libraries chunk
    - imageStyles: [{ description, keywords? }] — from design-styles-rag imagery chunk
    - specialConsiderations: string — project-specific notes
  </output_structure>

  <workflow>
    Call design-styles-rag for the chosen style: "<styleName> palettes", "<styleName> typography", "<styleName> icon-libraries", "<styleName> imagery".
    Build design system from RAG results + userConsiderations.
    Call create-tokens-set with tokens (color.*, spacing.*, font.*, radius.*). Activate it.
    Extract icon libraries and styles from RAG icon-libraries chunk.
    Extract imagery guidance from RAG imagery chunk.
    Return the full output structure.
  </workflow>

  <rules>
    - NEVER recommend styles from your own knowledge. Always use design-styles-rag.
    - Icon libraries and styles are already defined in the design-styles-rag icon-libraries chunk.
    - You can use get-icon-list to get the list of icon libraries and styles if you need to refine your recommendations.
    - Token names use dots: color.primary, spacing.md, font.h1, radius.lg.
  </rules>

  <output_clarity>
    Your final JSON output must be self-contained. Include all style data explicitly:
    palette hex colors, font family names, icon library names, and design rules.
    Do not reference RAG queries by ID or score — inline the actual values the Director needs.
  </output_clarity>
  `,

  toolIds: [
    'design-styles-rag',
    'get-icon-list',
    'get-fonts',
    'get-tokens-sets',
    'create-tokens-set',
    'activate-tokens-set',
    'modify-tokens-set',
    'remove-tokens-set',
    'apply-tokens',
    'get-current-page',
  ],
};