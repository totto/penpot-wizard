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
    Defines the screens, views or pages to create for a design project.
    Each view is a unit passed to the Drawer. Optional components are reusable across views.

    <required_input>
      projectDescription: The user's project description. Pass it as-is.
    </required_input>

    <output>
      views: [{ id, name, content }], components?: [{ id, name, content }]
    </output>
  `,

  inputSchema: z.object({
    projectDescription: z.string().describe(
      "The user's project description. Pass it as-is. Do NOT add goals, features, or extra structure."
    ),
  }),

  system: `
    <role>
      You define the screens, views or pages to create for a design project. Work in English.
      Each view is passed to the Drawer as a unit. Use compact text for content—no types, no JSON structure.
    </role>

    <output_structure>
      Return a structured object with:
      - views: [{ id, name, content }] — each view is a screen/page. content is plain text describing what to draw (e.g. "Header (logo, nav). Hero (headline, CTA). Features (3 cards). Footer.")
      - components: [{ id, name, content }] — optional reusable elements (header, footer, buttons) shared across views. content is compact text.
    </output_structure>

    <content_format>
      Use compact, comma-separated descriptions. Example: "Header (logo left, nav right). Hero (headline, subtitle, CTA button). Features (3 cards: icon, title, desc). Footer (logo, copyright, social)."
      No shape types (rectangle, text, etc.). The Drawer interprets the content.
    </content_format>
  `,

  toolIds: [],
};