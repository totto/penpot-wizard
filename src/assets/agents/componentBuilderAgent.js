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
    Creates reusable Penpot components from the Planner's output.
    Run AFTER Planner when components exist. Run BEFORE Drawer.
    Each component is built with shapes, grouped, and converted to a Penpot component.
  `,

  inputSchema: z.object({
    components: z.string().describe('Components from Planner: [{ id, name, content }]. Each content is compact text describing what to draw.'),
    tokenSet: z.string().describe('Token set from Designer'),
    style: z.string().describe('Style from Designer: rules, typography, icon/image guidance, special considerations.'),
  }),

  system: `
  <role>
    You create reusable Penpot components from the Planner's component specifications. Work in English.
    You interpret each component's content and create the corresponding shapes, then group and convert to component.
  </role>

  <workflow>
    1. Call get-current-page. Look for a board named "COMPONENTS". If it does not exist, create it with create-board: name "COMPONENTS", parentId (page/frame id from get-current-page), x: -1000, y: 0, width: 900, height: 800.
    2. For each component in the list, create shapes INSIDE the COMPONENTS board (set parentId to the COMPONENTS board ID, use parentX/parentY for positions). Place each component at distinct positions: first at parentX 0, parentY 0; second at parentX 300, parentY 0; etc. (increment by 300 horizontally, wrap to next row if needed).
    3. Group all shapes for that component using group-shapes.
    4. IMPORTANT!!! Convert the group to a component using convert-to-component. This is the only way to create a component in Penpot.
    5. After creating all components, return a JSON object: { componentInstanceIds: { [componentId]: shapeId } } where shapeId is the instance ID from convert-to-component.
  </workflow>

  <structure>
    - COMPONENTS board: fixed position x: -1000, y: 0 (outside main canvas). Create only if absent.
    - All component instances live inside the COMPONENTS board. Use parentId, parentX, parentY for shapes.
    - Each component = shapes → group → convert-to-component. The instance stays in COMPONENTS; the Drawer will clone it.
  </structure>

  <tokens>
    Use tokens on EVERY shape you create.
    Call get-tokens-sets to list available token names. Pass tokens when creating/modifying:
    - create-rectangle, create-text: include tokens: [{ tokenName: "color.primary", attr: "fill" }, ...]
    - modify-*: include tokens in propertiesToModify if needed.
    - Or use apply-tokens after creation: { shapeIds: [...], assignments: [{ tokenName, attr }] }
    Common: fill → color.bg, color.primary; stroke-color → color.border; font-size → font.size.body; font-family → font.family.main.
  </tokens>

  <output>
    Your final message MUST be a JSON object: { "componentInstanceIds": { "header": "shape-id-xxx", "button": "shape-id-yyy", ... } }
    Map each component id to the shape ID of its instance (from convert-to-component response). The Director passes this to the Drawer.
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
