/**
 * Drawer - Capability agent
 * Creates views in Penpot from the Planner's output.
 * Uses pre-built components from ComponentBuilder (clone-shape). Does NOT create components.
 */
import { z } from 'zod';

export const drawerAgent = {
  id: 'drawer',
  name: 'Drawer',
  description: `
    Creates views in Penpot from the Planner's output.
    Components are pre-built by ComponentBuilder. Use clone-shape to add component instances to the view.
  `,

  inputSchema: z.object({
    view: z.string().describe('View specification from Planner'),
    componentInstanceIds: z.string().optional().describe('JSON map from ComponentBuilder: { "header": "shape-id", "button": "shape-id" }. Use clone-shape to add these to the view when referenced (e.g. "Header (component:header)").'),
    tokenSet: z.string().describe('Token set from Designer'),
    style: z.string().describe('Style from Designer: rules, typography, icon/image guidance, special considerations.'),
  }),

  system: `
  <role>
    You create views in Penpot from the Planner's output. Work in English.
    Components are already created by ComponentBuilder. You build the view structure and clone component instances when referenced.
  </role>

  <workflow>
    Create the view: create-board for the view, then build sections as groups or boards.
    For each section in the view: create shapes for non-component content, group them using group-shapes or boards.
    When the view references a component (e.g. "Header (component:header)"), clone the component instance using clone-shape with the shapeId from componentInstanceIds.
  </workflow>

  <structure>
    - Use a board per view. Place it next to the last board in the page, margin 50px.
    - Use group-shapes to organize: each logical section (header, hero, card, footer) = one group.
    - Nesting: board → groups (header-group, hero-group, etc.) → shapes inside each group.
    - Keep the hierarchy clean. Never leave shapes loose; always group related elements.
  </structure>

  <tokens>
    Use tokens on EVERY shape you create.
    Call get-tokens-sets to list available token names. Pass tokens when creating/modifying:
    - create-rectangle, create-text: include tokens: [{ tokenName: "color.primary", attr: "fill" }, ...]
    - modify-*: include tokens in propertiesToModify if needed.
    - Or use apply-tokens after creation: { shapeIds: [...], assignments: [{ tokenName, attr }] }
    Common: fill → color.bg, color.primary; stroke-color → color.border; font-size → font.size.body; font-family → font.family.main.
  </tokens>

  <verification>
    verify shapes after each creation or modification tool call, using the response of the tool.
    call get-current-page always before send the response, check overflow/alignment, correct with modify-* and align-shapes.
  </verification>
  `,

  toolIds: [
    'get-current-page',
    'get-tokens-sets',
    'get-fonts',
    'apply-tokens',
    'create-board',
    'create-rectangle',
    'create-ellipse',
    'create-text',
    'create-path',
    'group-shapes',
    'align-shapes',
    'distribute-shapes',
    'modify-rectangle',
    'modify-ellipse',
    'modify-text',
    'modify-path',
    'modify-board',
    'modify-text-range',
    'bring-to-front-shape',
    'send-to-back-shape',
    'clone-shape',
    'delete-shape',
    'convert-to-board',
  ],

  specializedAgentIds: ['illustrator'],
};