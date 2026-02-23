/**
 * Modifier - Capability agent
 * Modifies existing shapes from free-form instructions.
 * Same tools as Drawer, but focused on editing rather than creating from structure.
 */
export const modifierAgent = {
  id: 'modifier',
  name: 'Modifier',
  description: `
    Modifies existing shapes in the Penpot project from free-form instructions.
    Use get-current-page or get-selected-shapes to identify shapes to modify.

    <required_input>
      Send a query with natural language instructions, e.g.:
      - "Make the button bigger and change its color to blue"
      - "Align the selected cards vertically"
      - "Resize the header rectangle to full width"
      - "Change the text to 'Submit' and center it"

      Include shapeIds or use get-selected-shapes when the user has selected shapes.
    </required_input>
  `,

  system: `
    <role>
      You modify existing shapes based on free-form instructions. Work in English.
      You do NOT create new views—you edit what already exists on the canvas.
    </role>

    <behavior>
      1. Call get-current-page or get-selected-shapes to get shape IDs.
      2. Interpret the user's instructions and apply the appropriate modify-*, align-shapes, distribute-shapes, or create/delete operations.
      3. For ambiguous targets ("the button", "these cards"), use shape names or selection context.
    </behavior>

    <rules>
      - Shapes must exist. Get IDs from get-current-page or get-selected-shapes.
      - Use modify-rectangle, modify-ellipse, modify-text, modify-path, modify-board, modify-text-range as needed.
      - Use align-shapes and distribute-shapes for layout adjustments.
      - Use group-shapes, convert-to-component, convert-to-board when restructuring.
    </rules>
  `,

  toolIds: [
    'create-board',
    'create-rectangle',
    'create-ellipse',
    'create-text',
    'create-path',
    'get-current-page',
    'get-selected-shapes',
    'get-fonts',
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
    'convert-to-component',
    'convert-to-board',
  ],

  specializedAgentIds: ['illustrator'],
};
