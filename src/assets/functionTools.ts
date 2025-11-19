import { 
  FunctionTool, 
  ClientQueryType, 
  AddImageFromUrlQueryPayload, 
  ToggleLockSelectionQueryPayload, 
  ToggleLockSelectionResponsePayload 
} from '@/types/types';
import type { MoveQueryPayload, MoveResponsePayload } from '@/types/types';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';

// Function to get user data - this would typically come from Penpot context
export const functionTools: FunctionTool[] = [
  {
    id: "get-user-data",
    name: "getUserData",
    description: `
      Use this tool to get information about the active user on Penpot.
      It returns the user name and id.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_USER_DATA, undefined);
      return response;
    },
  },{
    id: "get-project-data",
    name: "getProjectData",
    description: `
      Use this tool to get information about the active project on Penpot.
      This includes: name, id and pages
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_PROJECT_DATA, undefined);
      return response;
    },
  },{
    id: "get-available-fonts",
    name: "getAvailableFonts",
    description: `
      Use this tool to get the available fonts on Penpot.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_AVAILABLE_FONTS, undefined);
      return response;
    },
  },{
    id: "get-current-page",
    name: "getCurrentPage",
    description: `
      Use this tool to get the current page on Penpot.
      This includes: name, id and shapes
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_PAGE, undefined);
      return response;
    },
  },
  {
  id: 'toggle-selection-lock',
  name: 'toggleSelectionLock',
    description: `
      Lock or unlock the currently selected shapes. If called without an explicit 'lock' boolean
      the tool will read the selection and:
      - If all selected shapes are unlocked, it will lock them.
      - If all selected shapes are locked, it will unlock them.
      - If selection contains both locked and unlocked shapes, it will return a prompt payload
        that the UI can use to ask the user whether to lock the unlocked shapes or unlock
        the locked shapes.
    `,
    inputSchema: z.object({
      lock: z.boolean().optional(),
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { lock?: boolean; shapeIds?: string[] }) => {
      // If args undefined (no explicit input), return read-only selection info
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      // Read selection first for message tailoring, then call the toggle action
  await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);

      // Call plugin to lock/unlock (explicit or inferred)
  const response = await sendMessageToPlugin(ClientQueryType.TOGGLE_LOCK_SELECTION, args as unknown as ToggleLockSelectionQueryPayload);

      // If plugin returned mixed-selection info, surface it in the message
  const payload = response.payload as ToggleLockSelectionResponsePayload | undefined;
      if (payload && Array.isArray(payload.lockedShapes) && Array.isArray(payload.unlockedShapes) && payload.lockedShapes.length > 0 && payload.unlockedShapes.length > 0) {
        response.message = `The selection contains locked and unlocked shapes. Locked: ${payload.lockedShapes.map(s => s.name ?? s.id).join(', ')}; Unlocked: ${payload.unlockedShapes.map(s => s.name ?? s.id).join(', ')}. Specify lock=true to lock all unlocked shapes, or lock=false to unlock all locked shapes.`;
      }

      return response;
    },
  },
  {
    id: 'move-selection',
    name: 'moveSelection',
    description: `
      Move the currently selected shapes using dx/dy (relative) or x/y (absolute) coordinates.
      Locks are respected: locked shapes will be skipped. If locked shapes were skipped, the function
      will append a user-friendly message to the plugin response showing the names of skipped shapes.
    `,
    inputSchema: z.object({
      dx: z.number().optional(),
      dy: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    function: async (args: MoveQueryPayload) => {
      if (!args || (typeof args.dx === 'undefined' && typeof args.dy === 'undefined' && typeof args.x === 'undefined' && typeof args.y === 'undefined')) {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      // Read selection before performing the action to tailor the user message if locked shapes
      // are skipped by the move operation.
      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);

      const response = await sendMessageToPlugin(ClientQueryType.MOVE, args as unknown as MoveQueryPayload);
      // Tailor the message depending on number of skipped locked shapes and selection context
      const payload = response.payload as MoveResponsePayload | undefined;
      if (payload?.skippedLockedNames && payload.skippedLockedNames.length > 0) {
        const skipped = payload.skippedLockedNames;
  const selectionCount = ((selectionResp.payload as unknown) as { selectionCount?: number })?.selectionCount ?? 0;

        if (skipped.length === 1) {
          const name = skipped[0];
          if (selectionCount <= 1) {
            response.message = `We couldn't move ${name} because it is locked. I can provide instructions to unlock it, or unlock it and retry the move.`;
          } else {
            response.message = `One of the selected shapes, ${name}, is locked and was skipped. The other shapes were moved. I can provide instructions to unlock it, or re-run the move once it's unlocked.`;
          }
        } else {
          response.message = `The following shapes are locked and were skipped: ${skipped.join(', ')}. The other shapes were moved; I can provide instructions to unlock them so I can also move them.`;
        }
      }

      return response;
    },
  },
    {
      id: "add-image-from-url",
      name: "addImageFromUrl",
      description: `
        Upload an image from a URL and place it on the Penpot canvas.
        Provide either a name (optional) and a fully-qualified URL to the image.
        The plugin will download the URL and add a rectangle with the uploaded image as a fill.
      `,
      inputSchema: z.object({
        name: z.string().optional(),
        url: z.string().url(),
      }),
      function: async (input: { name?: string; url: string }) => {
        const response = await sendMessageToPlugin(ClientQueryType.ADD_IMAGE_FROM_URL, input as unknown as AddImageFromUrlQueryPayload);
        return response;
      },
    },
    {
    id: "get-current-theme",
    name: "getCurrentTheme",
    description: `
      Use this tool to get the current theme (light or dark) on Penpot.
      This includes: 'light' or 'dark'
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_THEME, undefined);
      return response;
    },
  },
   {
    id: "get-active-users",
    name: "getActiveUsers",
    description: `
      Use this tool to list all the active collaborators currently working on the same Penpot project.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_ACTIVE_USERS, undefined);
      return response;
    },
  },
  {
    id: "get-file-versions",
    name: "getFileVersions",
    description: `
      Use this tool to get all saved versions of the current Penpot file.
      It lists version labels, creation dates, and whether they are autosaves or manual saves.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_FILE_VERSIONS, undefined);
      return response;
    },
  },

  {
    id: "create-shape-from-svg",
    name: "createShapeFromSvg",
    description: `
      Create a new shape in Penpot from an SVG string.
      This tool takes valid SVG markup and converts it into editable Penpot shapes.
      Useful for importing custom icons, logos, or complex graphics from SVG format.
      
      The tool uses the current selection to determine positioning:
      - If shapes are selected: positions the new SVG shape next to the first selected shape
      - If no shapes are selected: positions the new SVG shape at a default location
      
      Parameters:
      - svgString: A valid SVG string containing the shape definition
      - name: Optional name for the created shape
      
      The SVG should be a valid XML string with proper SVG elements like <svg>, <path>, <circle>, etc.
      Complex SVGs with multiple elements will be grouped together as a single shape.
    `,
    inputSchema: z.object({
      svgString: z.string().min(1, "SVG string cannot be empty"),
      name: z.string().optional(),
    }),
    function: async (input: { svgString: string; name?: string }) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_SHAPE_FROM_SVG, input);
      return response;
    },
  },

  // NOTE: undo-last-action should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without redo functionality, users cannot easily restore
  // changes they just undid, creating a frustrating user experience.
  { id: "undo-last-action",
    name: "undoLastAction",
    description: `
      Undo the most recent action performed by the AI assistant.
      This can reverse fill color changes, blur effects, and other modifications made to shapes.
      Use this when the user wants to revert the last change made by the assistant.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.UNDO_LAST_ACTION, undefined);
      return response;
    },
  },
  // NOTE: redo-last-action should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without redo functionality, users cannot easily restore
  // changes they just undid, creating a frustrating user experience.
  {
    id: "redo-last-action",
    name: "redoLastAction",
    description: `
      Redo the most recently undone action performed by the AI assistant.
      This can reapply fill color changes, blur effects, and other modifications that were previously undone.
      Use this when the user wants to restore a change they just undid.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.REDO_LAST_ACTION, undefined);
      return response;
    },
  },
  {
    id: "export-selection-as-svg",
    name: "exportSelectionAsSvg",
    description: `
      Export the currently selected shapes as a single SVG file with multiple save options.
      
      **Background Options:**
      - Defaults to transparent background
      - Set includeBackground=true for white background
      
      **Save Options Provided:**
      - Copy SVG code for manual saving
      - Blob URL for direct downloading
      - Instructions for text editor saving
      - Comparison with Penpot's native export
      
      Use this tool when:
      - User wants to export their current selection as SVG
      - User needs vector graphics for web development
      - User wants to share designs in SVG format
      - User needs scalable graphics for print or digital use
      
      The exported SVG combines all selected shapes into one document with proper positioning.
    `,
    inputSchema: z.object({
      includeBackground: z.boolean().optional().describe("Whether to include a white background in the exported SVG. Defaults to false (transparent)."),
    }),
    function: async (args) => {
      const response = await sendMessageToPlugin(ClientQueryType.EXPORT_SELECTION_AS_SVG, args);
      return response;
    },
  },
  {
    id: "resize-selection",
    name: "resizeSelection",
    description: `
      Use this tool to resize the currently selected shapes, boards, images, or other selectable objects in Penpot using scale factors.
      Scale factors determine how much to multiply the current dimensions by (e.g., 1.5 = 50% larger, 0.5 = half size).
      This tool works on all selectable objects including shapes, boards, images, and groups.
      If you call this tool with no scale factors, it returns the current selection information (dimensions, position) so the director or UI can display them before asking for scale.
      Examples:
      - scaleX: 2.0, scaleY: 2.0 → Double the size in both dimensions
      - scaleX: 1.5 → Make 50% wider (height unchanged)
      - scaleX: 0.5, scaleY: 0.5 → Half the size in both dimensions
      - scaleX: 1.2, maintainAspectRatio: true → 20% larger maintaining proportions
    `,
    inputSchema: z.object({
      scaleX: z.number().positive().optional().describe("Scale factor for width (e.g., 1.5 = 50% larger, 0.5 = half width)."),
      scaleY: z.number().positive().optional().describe("Scale factor for height (e.g., 2.0 = double height, 0.75 = 25% smaller)."),
      maintainAspectRatio: z.boolean().optional().default(true).describe("Whether to maintain the aspect ratio when resizing. If true, uses scaleX for both dimensions. Defaults to true."),
    }),
    function: async (args) => {
      // If no scale factors are provided, return read-only selection information
      // so the director or UI can present the current dimensions to the user.
      if (!args || (typeof args.scaleX === 'undefined' && typeof args.scaleY === 'undefined')) {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.RESIZE, args);
      return response;
    },
  },
  {
    id: "rotate-selection",
    name: "rotateSelection",
    description: `
      Rotate the currently selected shapes (boards, images, paths, text, etc.) by a given angle in degrees.
      Positive values rotate clockwise. If no angle is supplied, the tool returns read-only selection info so the UI can show current rotations.
    `,
    inputSchema: z.object({
      angle: z.number().optional().describe('Rotation angle in degrees. Positive clockwise.'),
    }),
    function: async (args) => {
      if (!args || typeof args.angle !== 'number') {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.ROTATE, args);
      return response;
    },
  },
  {
    id: "get-selection-info",
    name: "getSelectionInfo",
    description: `
      Get detailed information about the currently selected shapes in Penpot.
      Returns properties like dimensions, position, type, and other attributes for each selected shape.
      This is useful for understanding what shapes are selected before performing operations.
      
      Returns an array of shape information including:
      - id: Unique identifier
      - name: Shape name (if any)
      - type: Shape type (rect, circle, path, text, etc.)
      - x, y: Position coordinates
      - width, height: Dimensions
      - rotation: Rotation angle (if any)
      - opacity: Opacity value (if any)

      NOTE: This tool is READ-ONLY — use only for querying selection state. Do NOT call this tool when you intend to modify shapes.
      To modify shapes, use action tools (e.g., 'resize-selection') which will internally use safe action APIs (getSelectionForAction()).
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      return response;
    },
  },
];


