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
    Use this tool to create views in Penpot from the Planner's output.
    Call this tool after calling the planner tool and the component-builder tool.
    This tool builds the view structure and uses clone-shape to add component instances when the view references them.
  `,

  inputSchema: z.object({
    view: z.string().describe('View specification from Planner'),
    tokenSet: z.string().describe('Token set from Designer'),
    style: z.string().describe('Style from Designer: rules, typography, icon/image guidance, special considerations.'),
  }),

  system: `
  <role>
    You are an expert tool for creating views in Penpot from the Planner's output. Work in English.
    Components are already created by ComponentBuilder. You build the view structure and clone component instances when referenced.
  </role>

  <workflow>
    1. Create the view: create a board with the defined size in a free area of the page (use get-current-page to see the content and find an available spot).
    If needed, use a flex or grid layout on the container board to organize the shapes.
    2. Create the different sections of the view sequentially.
    3. Review what you have created with get-current-page and correct positioning, alignment, size issues, etc.
    4. Return a markdown report of the view created.
  </workflow>

  <section-creation-workflow>
    1. Create a board to group the section shapes; if needed, use a flex or grid layout to organize the shapes.
    2. Create the section shapes using the board id from step 1 as parentId.
    3. If the section contains a component, clone the component using clone-shape.
    4. Review what you have created with get-current-page and correct positioning, alignment, size issues, etc.
  </section-creation-workflow>

  <tokens>
    Use tokens on EVERY shape you create.
    Call get-tokens-sets to list available token names. Pass tokens when creating/modifying:
    - create-rectangle, create-text: include tokens: [{ tokenName: "color.primary", attr: "fill" }, ...]
    - modify-*: include tokens in propertiesToModify if needed.
    - Or use apply-tokens after creation: { shapeIds: [...], assignments: [{ tokenName, attr }] }
    Common: fill → color.bg, color.primary; stroke-color → color.border; font-size → font.size.body; font-family → font.family.main.
  </tokens>
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