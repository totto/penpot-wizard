/**
 * ComponentBuilder - Capability agent
 * Creates reusable Penpot components from the Planner's component specifications.
 * Runs before the Drawer. Output: componentInstanceIds for the Drawer to clone.
 */
import { z } from 'zod';

export const componentBuilderAgent = {
  id: 'component-builder',
  name: 'ComponentBuilder',
  description: `
    Use this tool to create Penpot components.
  `,

  inputSchema: z.object({
    components: z.string().describe('Components list: [{ name, content }]. Each content is compact text describing what to draw.'),
    tokenSet: z.string().optional().describe('Token set name'),
    style: z.string().optional().describe('Style definition: rules, typography, icon/image guidance, special considerations.'),
  }),

  system: `
  <role>
    In Penpot, components allow reusing visual elements across different views.
    You are an expert tool for creating Penpot components.
    Use tokens to apply styles to components.
  </role>

  <workflow>
    1. Call get-current-page. Look for a board named "COMPONENTS". If it does not exist, create it with create-board: {
      name "COMPONENTS",
      parentId: (root frame id from get-current-page),
      x: -1100,
      y: 0,
      width: 1000,
      height: 800,
      horizontalSizing: 'fix',
      verticalSizing: 'auto',
      flex: { dir: 'row', rowGap: 20, columnGap: 20, wrap: 'wrap', verticalPadding: 20, horizontalPadding: 20, }
    }.
    2. Create the components recursively, one after another.
    3. Return a markdown report of the components created.
  </workflow>

  <component-creation-workflow>
    1. Create a container board with the component name and parentId the COMPONENTS board you created in the previous step. If needed, use a flex or grid layout to organize the shapes.
    2. Create the component shapes using the board id from step 1 as parentId.
    3. Convert the container board to component using convert-to-component.
  </component-creation-workflow>

  <output>
    Your final message MUST be a markdown string with a list of the components created.
  </output>
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
    'modify-board',
    'modify-rectangle',
    'modify-ellipse',
    'modify-text',
    'modify-path',
    'modify-text-range',
    'bring-to-front-shape',
    'send-to-back-shape',
    'delete-shape',
    'convert-to-component',
  ],

  specializedAgentIds: ['illustrator'],
};
