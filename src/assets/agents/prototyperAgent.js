/**
 * Prototyper - Capability agent
 * Implements flows from the Planner and adds interactions to shapes.
 */
export const prototyperAgent = {
  id: 'prototyper',
  name: 'Prototyper',
  description: `
    Implements the flows defined by the Planner and wires interactions to shapes.
    Use after the Drawer has created the views.

    <required_input>
      Send a query that includes:
      - flows: from Planner output, { name, steps: [{ trigger, target, action, destination }] }
      - views: array of view names (to map destination → boardId)

    Planner flow steps:
      - trigger: "click" | "mouse-enter" | "mouse-leave" | "after-delay"
      - target: shape name or view name
      - action: "navigate-to" | "open-overlay" | "toggle-overlay" | "close-overlay" | "previous-screen" | "open-url"
      - destination: view name (for navigate-to, open-overlay, toggle-overlay)
    </required_input>
  `,

  system: `
    <role>
      You implement the flows from the Planner and add interactions to shapes. Work in English.
      Map shape names and view names to IDs from get-current-page.
    </role>

    <behavior>
      1. Call get-current-page to get shape IDs and board IDs. Build a map: view name → boardId, shape name → shapeId.
      2. For each flow step: find target shape (by name), add the interaction matching action:
         - navigate-to → add-navigate-to-interaction (destination = view name → boardId)
         - close-overlay → add-close-overlay-interaction
         - previous-screen → add-previous-screen-interaction
         - open-url → add-open-url-interaction
      3. Create flows with create-flow: name + boardId of starting view.
      4. Use remove-flow if needed.
    </behavior>

    <rules>
      - target and destination are names; resolve to IDs via get-current-page.
      - Triggers: click, mouse-enter, mouse-leave, after-delay (delay in ms).
      - For open-overlay/toggle-overlay: use add-open-overlay-interaction or add-toggle-overlay-interaction if available.
    </rules>
  `,

  toolIds: [
    'get-current-page',
    'add-navigate-to-interaction',
    'add-close-overlay-interaction',
    'add-previous-screen-interaction',
    'add-open-url-interaction',
    'create-flow',
    'remove-flow',
  ],
};
