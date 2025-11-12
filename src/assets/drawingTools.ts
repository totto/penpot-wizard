import { drawShape, sendMessageToPlugin } from '@/utils/pluginUtils';
import { z } from 'zod';
import { PenpotShapeType, FunctionTool, ClientQueryType } from '@/types/types';
import { baseShapeProperties, pathShapeProperties, textShapeProperties } from '@/types/shapeTypes';

export const drawingTools: FunctionTool[] = [
  {
    id: "rectangle-maker",
    name: "RectangleMakerTool",
    description: `
      Use this tool to draw a rectangle.
      Use parentId to place the rectangle inside a specific board.
      ⚠️ IMPORTANT: If this rectangle is a background, draw it AFTER foreground elements (text, icons).
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.RECTANGLE, shapeProperties);
      return response;
    },
  },   {
    id: 'ellipse-maker',
    name: 'EllipseMakerTool',
    description: `
      Use this tool to draw an ellipse.
      Use parentId to place the ellipse inside a specific board.
      ⚠️ IMPORTANT: If this ellipse is a background, draw it AFTER foreground elements.
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.ELLIPSE, shapeProperties);
      return response;
    },
  },   {
    id: 'path-maker',
    name: 'PathMakerTool',
    description: `
      Use this tool to draw a path. You can draw complex shapes like stars, polygons, curves, etc. using the path tool.
      Define the path with the content property, defining an array of path commands.
      Use parentId to place the path inside a specific board.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - If this path is decorative/foreground: draw it FIRST
      - If this path is background/container: draw it LAST (after all foreground elements)
    `,
    inputSchema: pathShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.PATH, shapeProperties);
      return response;
    },
  },   {
    id: 'text-maker',
    name: 'TextMakerTool',
    description: `
      Use this tool to draw a text.
      Use getProjectData first to see available fonts before creating text.
      Use parentId to place the text inside a specific board.
      
      🚨 TEXT USUALLY GOES ON TOP: Draw text elements BEFORE background shapes!
      Text should typically be drawn FIRST or EARLY in the drawing sequence.
    `,
    inputSchema: textShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.TEXT, shapeProperties);
      return response;
    },
  },   {
    id: 'board-maker',
    name: 'BoardMakerTool',
    description: `
      Use this tool to create a new board.
      Boards are layers that serve as your high-level containers for content organization and layout. 
      Boards are useful if you want to design for a specific screen or print size. Boards can contain other boards. 
      First-level boards act as screens in View mode, acting as screens of a design or pages of a document. 
      Use boards to organize related elements together.
      Also, objects inside boards can be clipped. Boards are a powerful element at Penpot, opening up a ton of 
      possibilities when creating and organizing your designs.
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.BOARD, shapeProperties);
      return response;
    },
  },
{
id: 'create-library-color',
    name: 'CreateLibraryColor',
    description: `
      Use this tool to create a new color in the library.
      Provide a name and hex color value.
    `,
    inputSchema: z.object({
      name: z.string().describe('The name of the color in the library'),
      color: z.string().describe('The hex color value, e.g. #FF5733'),
    }),
    function: async (colorProperties) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_COLOR, colorProperties);
      return response;
    },
  },
{
    id: 'create-library-font',
    name: 'CreateLibraryFont',
    description: `
      Use this tool to create a new typography style in the library.
      Provide a name, font family, and font size. Optional properties include font weight, style, line height, letter spacing, and text transform.
    `,
    inputSchema: z.object({
      name: z.string().describe('The name of the typography style in the library'),
      fontFamily: z.string().describe('The font family name, e.g. "Inter", "Arial", "Helvetica"'),
      fontSize: z.string().describe('The font size, e.g. "16px", "1.5rem", "24"'),
      fontWeight: z.string().optional().describe('The font weight, e.g. "400", "bold", "normal"'),
      fontStyle: z.enum(['normal', 'italic']).optional().describe('The font style'),
      lineHeight: z.string().optional().describe('The line height, e.g. "1.5", "24px"'),
      letterSpacing: z.string().optional().describe('The letter spacing, e.g. "0.5px", "2%"'),
      textTransform: z.enum(['uppercase', 'capitalize', 'lowercase']).optional().describe('The text transform'),
    }),
    function: async (fontProperties) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_FONT, fontProperties);
      return response;
    },
  },
{
  id: 'create-component-from-selection',
  name: 'CreateComponentFromSelection',
  description: `
    Use this tool to create a new component in the library from currently selected shapes.
    
    IMPORTANT: This tool ONLY works with shapes that are currently selected on the canvas.
    - First, ensure you have shapes selected using get-selection tool
    - The component will be created exactly as the selected shapes appear - ALL properties (size, fill, text, stroke, etc.) come directly from the selection
    - Properties are completely optional and depend on what shapes you select:
      * Lines: no fill, no text
      * Rectangles/circles: may have fill and/or stroke
      * Text shapes: have text content and styling
      * Groups: contain multiple shapes with their own properties
    - You MUST provide a name for the component
    
    If no shapes are selected, this tool will return a "NO_SELECTION" response that triggers helpful user guidance.
    Do NOT make assumptions about what properties shapes should have - accept any valid selection.
  `,
  inputSchema: z.object({
    name: z.string().describe('The name for the new component (required)'),
    useSelection: z.boolean().optional().describe('Must be true - this tool only works with selected shapes'),
  }),
  function: async (componentProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_COMPONENT, componentProperties);
    return response;
  },
},
{
  id: 'apply-blur-tool',
  name: 'ApplyBlurTool',
  description: `
    Apply a blur effect to the currently selected shapes on the canvas.
    The user must first select the shapes they want to blur before using this tool.
    Use this to create depth, focus attention, or create visual effects.
    
    Blur intensity guide:
    - 1-3px: Subtle blur for softening edges
    - 5-10px: Moderate blur for background effects  
    - 15-30px: Strong blur for depth of field
    - 50+px: Heavy blur for special effects
    
    If you don't specify blur intensity, a subtle 5px blur will be applied.
  `,
  inputSchema: z.object({
    blurValue: z.number().min(0).max(100).optional().default(5).describe('The blur radius in pixels (0-100). Defaults to 5px for subtle blur if not specified.'),
  }),
  function: async (blurProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_BLUR, blurProperties);
    return response;
  },
},
{
  id: 'apply-fill-tool',
  name: 'ApplyFillTool',
  description: `
    Apply a fill color to the currently selected shapes on the canvas.
    The user must first select the shapes they want to fill before using this tool.
    Use this to change the background color or fill color of shapes.
    
    Fill options:
    - Hex colors: #FF0000, #00FF00, #0000FF, etc.
    - Named colors: red, blue, green, etc.
    - Opacity: 0.0 to 1.0 (0.5 = 50% opacity)
    
    If you don't specify a fill color, black (#000000) will be used.
    If you don't specify opacity, 100% opacity (1.0) will be used.
  `,
  inputSchema: z.object({
    fillColor: z.string().optional().default('#000000').describe('The fill color as a hex string (e.g., #FF5733) or named color. Defaults to black if not specified.'),
    fillOpacity: z.number().min(0).max(1).optional().default(1).describe('The fill opacity from 0.0 (transparent) to 1.0 (opaque). Defaults to 1.0 if not specified.'),
  }),
  function: async (fillProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_FILL, fillProperties);
    return response;
  },
},
{
  id: 'apply-stroke-tool',
  name: 'ApplyStrokeTool',
  description: `
    Apply stroke properties to the currently selected shapes on the canvas.
    The user must first select the shapes they want to stroke before using this tool.
    Use this to change the outline/border color, width, style, and other stroke properties of shapes.

    Stroke options:
    - Stroke color: Hex colors (#FF0000) or named colors (red, blue, etc.)
    - Stroke width: Number in pixels (1, 2, 5, etc.)
    - Stroke opacity: 0.0 to 1.0 (0.5 = 50% opacity)
    - Stroke style: solid, dashed, dotted, mixed

    If you don't specify a stroke color, black (#000000) will be used.
    If you don't specify stroke width, 1 pixel will be used.
    If you don't specify opacity, 100% opacity (1.0) will be used.
    If you don't specify style, solid will be used.

    ⚠️ IMPORTANT: This tool will ALWAYS apply the stroke changes you request.
    If shapes already have strokes, the tool will ask for confirmation before overriding.
    To override existing strokes without being asked, set overrideExisting to true.
    Never suggest overrideExisting: false - this would prevent the stroke from being applied!
  `,
  inputSchema: z.object({
    strokeColor: z.string().optional().default('#000000').describe('The stroke color as a hex string (e.g., #FF5733) or named color. Defaults to black if not specified.'),
    strokeWidth: z.number().min(0).optional().default(1).describe('The stroke width in pixels. Defaults to 1 if not specified.'),
    strokeOpacity: z.number().min(0).max(1).optional().default(1).describe('The stroke opacity from 0.0 (transparent) to 1.0 (opaque). Defaults to 1.0 if not specified.'),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted', 'mixed']).optional().default('solid').describe('The stroke style. Defaults to solid if not specified.'),
    overrideExisting: z.boolean().optional().default(false).describe('Whether to override existing strokes without asking. Set to true when you want to apply stroke changes. Defaults to false for safety - the tool will ask for confirmation.'),
  }),
  function: async (strokeProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_STROKE, strokeProperties);
    return response;
  },
},
{
  id: 'apply-linear-gradient',
  name: 'ApplyLinearGradient',
  description: `
    Apply actual linear gradients to selected shapes using Penpot's gradient API.
    
    This tool creates true gradient fills with smooth color transitions:
    - Uses Penpot's documented gradient API with proper gradient objects
    - Supports custom colors, positioning, and gradient types
    - Applies gradient data directly to shape fills
    
    Linear gradient options:
    - Colors: Optional array of hex colors or named colors (intelligent defaults based on current fill)
    - Positioning: Optional start/end coordinates (0-1 scale)
    - Angle: Optional angle in degrees for gradient direction
    
    If you don't specify colors, uses intelligent defaults based on your shape's current fill.
    If you don't specify positions, defaults to left-to-right gradient.
    If you don't specify angle, uses the start/end positions.
    
    Note: Uses Penpot's gradient API - if gradients don't appear, the API may not be fully implemented yet.
  `,
  inputSchema: z.object({
    colors: z.array(z.string()).min(2).optional().describe("Array of color values (hex codes or named colors). If not specified, uses intelligent defaults based on your shape's current fill color."),
    startX: z.number().optional().describe("Starting X position (0-1, optional, defaults to 0)"),
    startY: z.number().optional().describe("Starting Y position (0-1, optional, defaults to 0)"),
    endX: z.number().optional().describe("Ending X position (0-1, optional, defaults to 1)"),
    endY: z.number().optional().describe("Ending Y position (0-1, optional, defaults to 1)"),
    angle: z.number().optional().describe("Angle in degrees for the gradient direction (optional)"),
  }),
  function: async (gradientProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_LINEAR_GRADIENT, gradientProperties);
    return response;
  },
},
{
  id: 'apply-radial-gradient',
  name: 'ApplyRadialGradient',
  description: `
    Apply actual radial gradients to selected shapes using Penpot's gradient API.
    
    This tool creates true gradient fills with smooth color transitions from center outward:
    - Uses Penpot's documented gradient API with proper gradient objects
    - Supports custom colors and positioning
    - Applies gradient data directly to shape fills
    
    Radial gradient options:
    - Colors: Optional array of hex colors or named colors (intelligent defaults based on current fill)
    - Center: Optional center position (0-1 scale, defaults to center)
    - Outer edge: Optional outer edge position (0-1 scale, defaults to center)
    
    If you don't specify colors, uses intelligent defaults based on your shape's current fill.
    If you don't specify positions, defaults to center-outward gradient.
    
    Note: Uses Penpot's gradient API - if gradients don't appear, the API may not be fully implemented yet.
  `,
  inputSchema: z.object({
    colors: z.array(z.string()).min(2).optional().describe("Array of color values (hex codes or named colors). If not specified, uses intelligent defaults based on your shape's current fill color."),
    startX: z.number().optional().describe("Center X position (0-1, optional, defaults to 0.5)"),
    startY: z.number().optional().describe("Center Y position (0-1, optional, defaults to 0.5)"),
    endX: z.number().optional().describe("Outer edge X position (0-1, optional, defaults to 0.5)"),
    endY: z.number().optional().describe("Outer edge Y position (0-1, optional, defaults to 0.5)"),
  }),
  function: async (gradientProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_RADIAL_GRADIENT, gradientProperties);
    return response;
  },
},
{
  id: 'apply-shadow-tool',
  name: 'ApplyShadowTool',
  description: `
    Apply shadow effects to the currently selected shapes on the canvas.
    The user must first select the shapes they want to add shadows to before using this tool.
    Use this to add drop shadows or inner shadows to shapes for depth and visual interest.

    Shadow options:
    - Shadow style: drop-shadow (outside the shape) or inner-shadow (inside the shape)
    - Shadow color: Hex colors (#FF0000) or named colors (red, blue, etc.)
    - Shadow offset: X and Y offset in pixels (positive/negative values)
    - Shadow blur: Blur radius in pixels (0 = sharp, higher = more blurred)
    - Shadow spread: Spread radius in pixels (optional, extends/contracts shadow)

    If you don't specify a shadow style, drop-shadow will be used.
    If you don't specify a shadow color, black (#000000) will be used.
    If you don't specify offset, 4px right and 4px down will be used.
    If you don't specify blur, 8px will be used.
    If you don't specify spread, 0px will be used.

    ⚠️ IMPORTANT: This tool will ALWAYS apply the shadow changes you request.
    If shapes already have shadows, the tool will ask for confirmation before overriding.
    To override existing shadows without being asked, set overrideExisting to true.
    Never suggest overrideExisting: false - this would prevent the shadow from being applied!
  `,
  inputSchema: z.object({
    shadowStyle: z.enum(['drop-shadow', 'inner-shadow']).optional().default('drop-shadow').describe('The shadow style. drop-shadow appears outside the shape, inner-shadow appears inside. Defaults to drop-shadow if not specified.'),
    shadowColor: z.string().optional().default('#000000').describe('The shadow color as a hex string (e.g., #FF5733) or named color. Defaults to black if not specified.'),
    shadowOffsetX: z.number().optional().default(4).describe('Horizontal shadow offset in pixels. Positive values move shadow right, negative left. Defaults to 4 if not specified.'),
    shadowOffsetY: z.number().optional().default(4).describe('Vertical shadow offset in pixels. Positive values move shadow down, negative up. Defaults to 4 if not specified.'),
    shadowBlur: z.number().min(0).optional().default(8).describe('Shadow blur radius in pixels. 0 = sharp shadow, higher values = more blurred. Defaults to 8 if not specified.'),
    shadowSpread: z.number().optional().default(0).describe('Shadow spread radius in pixels. Positive values expand shadow, negative contract it. Defaults to 0 if not specified.'),
    overrideExisting: z.boolean().optional().default(false).describe('Whether to override existing shadows without asking. Set to true when you want to apply shadow changes. Defaults to false for safety - the tool will ask for confirmation.'),
  }),
  function: async (shadowProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_SHADOW, shadowProperties);
    return response;
  },
},
{
  id: 'align-horizontal-tool',
  name: 'AlignHorizontalTool',
  description: `
    Align shapes horizontally using Penpot's alignment system.
    Works with 1 or more selected shapes.

    For single shapes: Aligns to the parent container bounds (left/center/right)
    For multiple shapes: Aligns shapes relative to each other

    Horizontal alignment options:
    - left: Align all shapes to the leftmost edge
    - center: Center all shapes horizontally
    - right: Align all shapes to the rightmost edge

    This tool uses Penpot's native alignment API and matches the behavior of Penpot's alignment tools.
    The alignment is reversible with the undo functionality.
  `,
  inputSchema: z.object({
    alignment: z.enum(['left', 'center', 'right']).describe('The horizontal alignment type. left aligns to left edges, center aligns centers, right aligns to right edges.'),
  }),
  function: async (alignmentProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.ALIGN_HORIZONTAL, alignmentProperties);
    return response;
  },
},
{
  id: 'align-vertical-tool',
  name: 'AlignVerticalTool',
  description: `
    Vertically align shapes in Penpot - top, center/middle, or bottom alignment.
    
    Use this tool to align shapes vertically. Supports:
    - Vertical alignment to top
    - Vertical center/middle alignment  
    - Vertical alignment to bottom
    
    Works with single or multiple selected shapes.
    Single shapes align to parent container, multiple shapes align relative to each other.
    Full undo/redo support using Penpot's native alignment API.
  `,
  inputSchema: z.object({
    alignment: z.enum(['top', 'center', 'bottom']).describe('The vertical alignment type. top aligns to top edges, center (middle) aligns centers vertically, bottom aligns to bottom edges.'),
  }),
  function: async (alignmentProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.ALIGN_VERTICAL, alignmentProperties);
    return response;
  },
}

];