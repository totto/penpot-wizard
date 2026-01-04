import { z } from 'zod';

const blendModes = ['difference','normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','exclusion','hue','saturation','color','luminosity'];

// Schema for Gradient objects
export const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']).describe('The type of gradient: linear (transitions along a straight line) or radial (transitions radiating outward from a central point)'),
  startX: z.number().min(0).max(1).describe('The X-coordinate of the starting point of the gradient, ranging from 0 to 1'),
  startY: z.number().min(0).max(1).describe('The Y-coordinate of the starting point of the gradient, ranging from 0 to 1'),
  endX: z.number().min(0).max(1).describe('The X-coordinate of the ending point of the gradient, ranging from 0 to 1'),
  endY: z.number().min(0).max(1).describe('The Y-coordinate of the ending point of the gradient, ranging from 0 to 1'),
  width: z.number().min(0).max(1).describe('The width of the gradient, ranging from 0 to 1. For radial gradients, this is interpreted as the radius'),
  stops: z.array(z.object({
    color: z.string().describe('The color at this stop in hex format (e.g., "#FF5733")'),
    opacity: z.number().min(0).max(1).optional().describe('The opacity level at this stop, ranging from 0 (fully transparent) to 1 (fully opaque). Defaults to 1 if omitted.'),
    offset: z.number().min(0).max(1).describe('The position of this stop along the gradient, ranging from 0 (start) to 1 (end)'),
  })).min(2).describe('Array of color stops that define the gradient. Must have at least 2 stops.'),
}).describe('A gradient object defining a linear or radial gradient fill');

// Schema for ImageData objects
export const imageDataSchema = z.object({
  id: z.string().describe('The unique identifier for the image'),
  width: z.number().describe('The width of the image'),
  height: z.number().describe('The height of the image'),
  mtype: z.string().default('image/png').describe('The media type of the image (e.g., "image/png", "image/jpeg")'),
  name: z.string().optional().describe('The optional name of the image'),
  keepAspectRatio: z.boolean().default(true).describe('Whether to keep the aspect ratio of the image when resizing. Defaults to false if omitted.'),
}).describe('An image data object defining an image fill for a shape');

// Schema for Fill objects - supports fillColor, fillColorGradient, and fillImage
export const fillSchema = z.object({
  fillColor: z.string().optional().describe('The fill color in hex format (e.g., "#FF5733"). One of fillColor, fillColorGradient, or fillImage must be provided.'),
  fillOpacity: z.number().min(0).max(1).optional().describe('The opacity level of the fill color, ranging from 0 (fully transparent) to 1 (fully opaque). Defaults to 1 if omitted. Only applies when using fillColor.'),
  fillColorGradient: gradientSchema.optional().describe('A gradient fill object. One of fillColor, fillColorGradient, or fillImage must be provided.'),
  fillImage: imageDataSchema.optional().describe('An image fill object. One of fillColor, fillColorGradient, or fillImage must be provided.'),
}).refine(
  (data) => data.fillColor !== undefined || data.fillColorGradient !== undefined || data.fillImage !== undefined,
  {
    message: "Either fillColor, fillColorGradient, or fillImage must be provided",
  }
).describe('A fill object defining a solid color fill, gradient fill, or image fill for a shape');

// Schema for Stroke objects - supports strokeColor and strokeColorGradient
export const strokeSchema = z.object({
  strokeColor: z.string().optional().describe('The stroke color in hex format (e.g., "#FF5733"). Either strokeColor or strokeColorGradient must be provided.'),
  strokeOpacity: z.number().min(0).max(1).optional().describe('The opacity level of the stroke color, ranging from 0 (fully transparent) to 1 (fully opaque). Defaults to 1 if omitted. Only applies when using strokeColor.'),
  strokeWidth: z.number().min(0).optional().describe('The width of the stroke. Defaults to 1 if omitted.'),
  strokeStyle: z.enum(['solid', 'dotted', 'dashed', 'mixed', 'none', 'svg']).optional().describe('The style of the stroke. Defaults to "solid" if omitted.'),
  strokeAlignment: z.enum(['center', 'inner', 'outer']).optional().describe('The alignment of the stroke relative to the shape\'s boundary. Defaults to "center" if omitted.'),
  strokeCapStart: z.enum(['round', 'square', 'line-arrow', 'triangle-arrow', 'square-marker', 'circle-marker', 'diamond-marker']).optional().describe('The cap style for the start of the stroke. Defaults to "round" if omitted.'),
  strokeCapEnd: z.enum(['round', 'square', 'line-arrow', 'triangle-arrow', 'square-marker', 'circle-marker', 'diamond-marker']).optional().describe('The cap style for the end of the stroke. Defaults to "round" if omitted.'),
  strokeColorGradient: gradientSchema.optional().describe('A gradient stroke object. Either strokeColor or strokeColorGradient must be provided.'),
}).refine(
  (data) => data.strokeColor !== undefined || data.strokeColorGradient !== undefined,
  {
    message: "Either strokeColor or strokeColorGradient must be provided",
  }
).describe('A stroke object defining either a solid color stroke or a gradient stroke for a shape');

// Schema for Shadow objects
export const shadowSchema = z.object({
  id: z.string().optional().describe('The optional unique identifier for the shadow'),
  style: z.enum(['drop-shadow', 'inner-shadow']).optional().describe('The style of the shadow: "drop-shadow" (cast outside the element) or "inner-shadow" (cast inside the element). Defaults to "drop-shadow" if omitted.'),
  offsetX: z.number().optional().describe('The X-axis offset of the shadow. Defaults to 0 if omitted.'),
  offsetY: z.number().optional().describe('The Y-axis offset of the shadow. Defaults to 0 if omitted.'),
  blur: z.number().min(0).optional().describe('The blur radius of the shadow. Defaults to 0 if omitted.'),
  spread: z.number().optional().describe('The spread radius of the shadow. Defaults to 0 if omitted.'),
  hidden: z.boolean().optional().describe('Specifies whether the shadow is hidden. Defaults to false if omitted.'),
  color: z.object({
    color: z.string().optional().describe('The color of the shadow in hex format (e.g., "#000000"). Defaults to black if omitted.'),
    opacity: z.number().min(0).max(1).optional().describe('The opacity level of the shadow color, ranging from 0 (fully transparent) to 1 (fully opaque). Defaults to 1 if omitted.'),
  }).optional().describe('The color object defining the shadow color and opacity.'),
}).describe('A shadow object defining a drop shadow or inner shadow for a shape');

/**
 * Generates base shape properties schema with descriptions adapted to the specific type.
 * 
 * @param type - The type of element: 'component', 'group', 'board', or 'shape'
 * @param customDesc - Optional object to override default descriptions for specific properties
 * @returns A Zod object schema with all base shape properties and contextualized descriptions
 */
function getBaseShapeProperties(
  type: string,
  customDesc?: Partial<Record<string, string>>
) {
  return {
    name: z.string().describe(customDesc?.name || `The name of the ${type}, used for visual identification and organization`),
    parentId: z.string().optional().describe('The id of the parent board or component'),
    x: z.number().describe(customDesc?.x || `The absolute x position of the ${type}, relative to the Root Frame board`),
    y: z.number().describe(customDesc?.y || `The absolute y position of the ${type}, relative to the Root Frame board`),
    width: z.number().describe(customDesc?.width || `The width of the ${type}`),
    height: z.number().describe(customDesc?.height || `The height of the ${type}`),
    borderRadius: z.number().optional().describe(customDesc?.borderRadius || `The border radius of the ${type}`),
    opacity: z.number().optional().describe(customDesc?.opacity || `The opacity of the ${type}`),
    blendMode: z.enum(blendModes).optional().describe(customDesc?.blendMode || `The blend mode of the ${type}`),
    fills: z.array(fillSchema).optional().describe(customDesc?.fills || `Array of fill objects to apply to the ${type}. Supports fillColor (solid color), fillColorGradient (linear or radial gradient), and fillImage (image fill).`),
    strokes: z.array(strokeSchema).optional().describe(customDesc?.strokes || `Array of stroke objects to apply to the ${type}. Supports strokeColor (solid color) and strokeColorGradient (linear or radial gradient).`),
    shadows: z.array(shadowSchema).optional().describe(customDesc?.shadows || `Array of shadow objects to apply to the ${type}. Supports drop-shadow and inner-shadow styles.`),
    zIndex: z.number().min(0).describe(customDesc?.zIndex || `The z-index of the ${type}, used to control stacking order.`),
  };
}

// Schema with only path-specific properties
export const pathShapeSchema = z.object({
  content: z.array(z.object({
    command: z.enum(['M', 'move-to', 'Z', 'close-path', 'L', 'line-to', 'H', 'line-to-horizontal', 'V', 'line-to-vertical', 'C', 'curve-to', 'S', 'smooth-curve-to', 'Q', 'quadratic-bezier-curve-to', 'T', 'smooth-quadratic-bezier-curve-to', 'A', 'elliptical-arc']).describe('The path command type'),
    params: z.object({
      x: z.number().optional().describe('The x-coordinate of the point (or endpoint)'),
      y: z.number().optional().describe('The y-coordinate of the point (or endpoint)'),
      c1x: z.number().optional().describe('The x-coordinate of the first control point for curves'),
      c1y: z.number().optional().describe('The y-coordinate of the first control point for curves'),
      c2x: z.number().optional().describe('The x-coordinate of the second control point for curves'),
      c2y: z.number().optional().describe('The y-coordinate of the second control point for curves'),
      rx: z.number().optional().describe('The radius of the ellipse\'s x-axis'),
      ry: z.number().optional().describe('The radius of the ellipse\'s y-axis'),
      xAxisRotation: z.number().optional().describe('The rotation angle of the ellipse\'s x-axis'),
      largeArcFlag: z.boolean().optional().describe('A flag indicating whether to use the larger arc'),
      sweepFlag: z.boolean().optional().describe('A flag indicating the direction of the arc'),
    }).optional().describe('The parameters of the path command'),
  })).describe('The array of path commands that defines the path'),
});

// Schema with only text-specific properties
export const textShapeSchema = z.object({
  characters: z.string().describe('The characters to draw'),
  fontFamily: z.string().describe('The font family of the text'),
  fontSize: z.number().describe('The font size of the text'),
  fontWeight: z.number().describe('The font weight of the text'),
  fontStyle: z.enum(['normal', 'italic']).optional().describe('The font style of the text'),
  lineHeight: z.number().min(0).max(10).default(1).describe('The separation between lines of text'),
  letterSpacing: z.number().describe('The letter spacing of the text'),
  textTransform: z.enum(['uppercase', 'lowercase', 'capitalize']).optional().describe('The text transform of the text'),
  textDecoration: z.enum(['underline', 'line-through']).optional().describe('The text decoration of the text'),
  direction: z.enum(['ltr', 'rtl']).optional().describe('The direction of the text'),
  align: z.enum(['left', 'center', 'right']).default('left').describe('The align of the text'),
  verticalAlign: z.enum(['center']).default('center').describe('The vertical align of the text'),
});

export const baseShapeProperties = z.object(getBaseShapeProperties('shape'));
export const pathShapeProperties = z.object(getBaseShapeProperties('path')).extend(pathShapeSchema.shape);
export const textShapeProperties = z.object(getBaseShapeProperties('text')).extend(textShapeSchema.shape);

export type BaseShapeProperties = z.infer<typeof baseShapeProperties>;
export type PathShapeProperties = z.infer<typeof pathShapeProperties>;
export type TextShapeProperties = z.infer<typeof textShapeProperties>;
export type PenpotShapeProperties = BaseShapeProperties | PathShapeProperties | TextShapeProperties;

// Schema for creating multiple shapes at once
const rectangleShapeSchema = z.object(getBaseShapeProperties('rectangle')).extend({
  type: z.literal('rectangle').describe('The type of shape: rectangle'),
});

const ellipseShapeSchema = z.object(getBaseShapeProperties('ellipse')).extend({
  type: z.literal('ellipse').describe('The type of shape: ellipse'),
});

const pathShapeWithTypeSchema = pathShapeProperties.extend({
  type: z.literal('path').describe('The type of shape: path'),
});

const textShapeWithTypeSchema = textShapeProperties.extend({
  type: z.literal('text').describe('The type of shape: text'),
});

export const createShapesSchema = z.object({
  shapes: z.array(
    z.discriminatedUnion('type', [
      rectangleShapeSchema,
      ellipseShapeSchema,
      pathShapeWithTypeSchema,
      textShapeWithTypeSchema,
    ])
  ).describe('Array of shapes to create. Important: use zIndex to control stacking order. Text and foreground elements should have a higher zIndex than backgrounds.'),
});

export const createComponentSchema = createShapesSchema.extend(
  z.object(getBaseShapeProperties('component')).shape
).describe('Schema for creating a component from shapes, use component properties to define the background fills, strokes, and shadows.');

export const createGroupSchema = createShapesSchema.extend(
  z.object(getBaseShapeProperties('group'))
  .omit({ fills: true, strokes: true, shadows: true })
  .shape
);

export const createBoardSchema = createShapesSchema.extend(
  z.object(getBaseShapeProperties('board'))
    .omit({ parentId: true, opacity: true, blendMode: true, zIndex: true })
    .shape
);

// Schema for modifying shape properties - all properties are optional except shapeId
// Reuses baseShapeProperties, pathShapeSchema, and textShapeSchema to avoid duplication
export const modifyShapePropertiesSchema = z.object({
  shapeId: z.string().describe('The ID of the shape to modify'),
})
  .extend(baseShapeProperties.omit({ zIndex: true }).partial().shape) // Omit zIndex as it's not modifiable
  .extend(pathShapeSchema.partial().shape) // Path-specific properties (optional)
  .extend(textShapeSchema.partial().shape); // Text-specific properties (optional)

export type ModifyShapeProperties = z.infer<typeof modifyShapePropertiesSchema>;