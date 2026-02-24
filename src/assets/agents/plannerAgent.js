/**
 * Planner - Capability agent
 * Defines which screens/views/pages to create and their content.
 * Output: views + optional components. Content is plain text (compact format).
 */
import { z } from 'zod';

export const plannerAgent = {
  id: 'planner',
  name: 'Planner',
  description: `
    Use this tool to create the complete plan for a design project.
    This tool creates project development plans including all required views and reusable components.
    Each view is a unit that can be sent to the drawer tool to be created. It contains the name and contents.
    The list of reusable components can be sent to the component-builder tool to be created.
    
    Defines the screens, views or pages to create for a design project.
    Each view is a unit passed to the Drawer. Optional components are reusable across views.

    <output>
      views: [{ name, content }],
      components?: [{ name, content }]
    </output>
  `,

  inputSchema: z.object({

    projectDescription: z.string().describe(`
      The user's project description. including:
      Project type: web, mobile or print.
      View Size: desktop, tablet, mobile, print, or whatever value from get-device-size-presets
    `),
  }),

  system: `
    <role>
      You define the screens, views or pages to create for a design project. Work in English.
      Each view is passed to the Drawer as a unit. Use compact text for content—no types, no JSON structure.
    </role>

    <output_structure>
      Return a structured markdown string with:
      - views: [{ name, size, content }] — each view is a screen/page. content is plain text describing what to draw (e.g. "Header (logo, nav). Hero (headline, CTA). Features (3 cards). Footer.")
      - components: [{ name, content }] — optional reusable elements (header, footer, buttons) shared across views. content is compact text.
    </output_structure>

    <content_format>
      Use compact, comma-separated descriptions. Example: "Header (logo left, nav right). Hero (headline, subtitle, CTA button). Features (3 cards: icon, title, desc). Footer (logo, copyright, social)."
      No shape types (rectangle, text, etc.). The Drawer interprets the content.
    </content_format>
  `,

  toolIds: ['get-device-size-presets'],
};