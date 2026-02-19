import { z } from 'zod';

const blendModes = ['difference','normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','exclusion','hue','saturation','color','luminosity'];

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

export const imageDataSchema = z.object({
  id: z.string().describe('The unique identifier for the image'),
  width: z.number().describe('The width of the image'),
  height: z.number().describe('The height of the image'),
  mtype: z.string().default('image/png').describe('The media type of the image (e.g., "image/png", "image/jpeg")'),
  name: z.string().optional().describe('The optional name of the image'),
  keepAspectRatio: z.boolean().default(true).describe('Whether to keep the aspect ratio of the image when resizing. Defaults to false if omitted.'),
}).describe('An image data object defining an image fill for a shape');

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

export const blurSchema = z.object({
  id: z.string().optional().describe('The optional unique identifier for the blur effect'),
  type: z.enum(['layer-blur']).optional().describe('The type of blur effect. Currently, only "layer-blur" is supported.'),
  value: z.number().min(0).optional().describe('The intensity value of the blur effect. Defaults to 0 if omitted.'),
  hidden: z.boolean().optional().describe('Specifies whether the blur effect is hidden. Defaults to false if omitted.'),
}).describe('A blur object defining a layer blur effect for a shape');

export const commonLayoutSchema = z.object({
  alignItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('The default alignment for items inside the container.'),
  alignContent: z.enum(['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('How content is aligned within the container when there is extra space.'),
  justifyItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('The default justification for items inside the container.'),
  justifyContent: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('How content is justified within the container when there is extra space.'),
  rowGap: z.number().optional().describe('The gap between rows in the layout.'),
  columnGap: z.number().optional().describe('The gap between columns in the layout.'),
  verticalPadding: z.number().optional().describe('The vertical padding inside the container.'),
  horizontalPadding: z.number().optional().describe('The horizontal padding inside the container.'),
  topPadding: z.number().optional().describe('The padding at the top of the container.'),
  rightPadding: z.number().optional().describe('The padding at the right of the container.'),
  bottomPadding: z.number().optional().describe('The padding at the bottom of the container.'),
  leftPadding: z.number().optional().describe('The padding at the left of the container.'),
  horizontalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('The horizontal sizing behavior of the container.'),
  verticalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('The vertical sizing behavior of the container.'),
}).describe('Common layout properties for flex and grid layouts.');

export const flexLayoutSchema = commonLayoutSchema.extend({
  dir: z.enum(['row', 'row-reverse', 'column', 'column-reverse']).describe('The direction of the flex layout.'),
  wrap: z.enum(['wrap', 'nowrap']).optional().describe('The wrapping behavior of the flex layout.'),
}).describe('A flex layout configuration for a container.');

export const trackSchema = z.object({
  type: z.enum(['flex', 'fixed', 'percent', 'auto']).default('auto').describe('The type of the grid track. Flex is a flexible track, fixed is a fixed track, percent is a track defined by a percentage, and auto is an automatic track. Do not use fixed type unless you are sure you need it. Auto, flex and percent types are recommended.'),
  value: z.number().nullable().describe('The value of the track; null or omitted for auto tracks. For flex tracks, the value is the flex-grow factor and is mandatory (default is 1). For fixed tracks, the value is the fixed size in pixels and is mandatory. For percent tracks, the value is the percentage of the container and is mandatory. For auto tracks, the value is null.'),
}).describe('A grid track definition (row or column).');

export const gridLayoutSchema = commonLayoutSchema.extend({
  dir: z.enum(['column', 'row']).describe('The primary direction of the grid layout.'),
  rows: z.array(trackSchema).optional().describe('Rows to add to the grid in order.'),
  columns: z.array(trackSchema).optional().describe('Columns to add to the grid in order.'),
}).describe('A grid layout configuration for a container.');

export const layoutChildSchema = z.object({
  absolute: z.boolean().default(false).describe('Whether the child element is positioned absolutely. Important: if this parameter is true, you should use x and y properties of the shape to position the element.'),
  zIndex: z.number().max(-1).min(-10000).optional().describe('The z-index of the child element.'),
  horizontalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('The horizontal sizing behavior of the child element.'),
  verticalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('The vertical sizing behavior of the child element.'),
  alignSelf: z.enum(['auto','start', 'center', 'end', 'stretch']).optional().describe('Alignment of the child element within its container.'),
  horizontalMargin: z.number().optional().describe('The horizontal margin of the child element.'),
  verticalMargin: z.number().optional().describe('The vertical margin of the child element.'),
  topMargin: z.number().optional().describe('The top margin of the child element.'),
  rightMargin: z.number().optional().describe('The right margin of the child element.'),
  bottomMargin: z.number().optional().describe('The bottom margin of the child element.'),
  leftMargin: z.number().optional().describe('The left margin of the child element.'),
  maxWidth: z.number().optional().nullable().describe('The maximum width of the child element, or null for no maximum.'),
  maxHeight: z.number().optional().nullable().describe('The maximum height of the child element, or null for no maximum.'),
  minWidth: z.number().optional().nullable().describe('The minimum width of the child element, or null for no minimum.'),
  minHeight: z.number().optional().nullable().describe('The minimum height of the child element, or null for no minimum.'),
}).describe('Layout properties for a child element inside a layout container.');

export const layoutCellSchema = z.object({
  row: z.number().min(1).describe('The row index of the cell. Important: the row index starts at 1.'),
  rowSpan: z.number().optional().default(0).describe('The number of rows the cell should span.'),
  column: z.number().min(1).describe('The column index of the cell. Important: the column index starts at 1.'),
  columnSpan: z.number().optional().default(0).describe('The number of columns the cell should span.'),
}).describe('Layout properties for a cell inside a grid layout.');

function getBaseShapeProperties(
  type,
  customDesc
) {
  return {
    name: z.string().describe(customDesc?.name || `The name of the ${type}, used for visual identification and organization`),
    x: z.number().optional().describe(customDesc?.x || `The absolute x position of the ${type}, relative to the Root Frame board`),
    y: z.number().optional().describe(customDesc?.y || `The absolute y position of the ${type}, relative to the Root Frame board`),
    parentX: z.number().optional().describe(customDesc?.parentX || `The x position of the ${type} relative to its parent`),
    parentY: z.number().optional().describe(customDesc?.parentY || `The y position of the ${type} relative to its parent`),
    rotation: z.number().min(0).max(359).optional().describe(customDesc?.rotation || `The rotation of the ${type} in degrees with respect to its center`),
    flipX: z.boolean().optional().describe(customDesc?.flipX || `Whether the ${type} is flipped horizontally`),
    flipY: z.boolean().optional().describe(customDesc?.flipY || `Whether the ${type} is flipped vertically`),
    width: z.number().optional().describe(customDesc?.width || `The width of the ${type}`),
    height: z.number().optional().describe(customDesc?.height || `The height of the ${type}`),
    borderRadius: z.number().optional().describe(customDesc?.borderRadius || `The border radius of the ${type}`),
    borderRadiusTopLeft: z.number().optional().describe(customDesc?.borderRadiusTopLeft || `The top-left border radius of the ${type}`),
    borderRadiusTopRight: z.number().optional().describe(customDesc?.borderRadiusTopRight || `The top-right border radius of the ${type}`),
    borderRadiusBottomRight: z.number().optional().describe(customDesc?.borderRadiusBottomRight || `The bottom-right border radius of the ${type}`),
    borderRadiusBottomLeft: z.number().optional().describe(customDesc?.borderRadiusBottomLeft || `The bottom-left border radius of the ${type}`),
    opacity: z.number().optional().describe(customDesc?.opacity || `The opacity of the ${type}`),
    blendMode: z.enum(blendModes).optional().describe(customDesc?.blendMode || `The blend mode of the ${type}`),
    fills: z.array(fillSchema).optional().describe(
      customDesc?.fills ||
      `Array of fill objects to apply to the ${type}. Supports fillColor (solid color), fillColorGradient (linear or radial gradient), and fillImage (image fill). Fills are applied in the order they are defined: the first fills are rendered on top, and the last fills are rendered at the bottom.`
    ),
    strokes: z.array(strokeSchema).optional().describe(customDesc?.strokes || `Array of stroke objects to apply to the ${type}. Supports strokeColor (solid color) and strokeColorGradient (linear or radial gradient).`),
    shadows: z.array(shadowSchema).optional().describe(customDesc?.shadows || `Array of shadow objects to apply to the ${type}. Supports drop-shadow and inner-shadow styles.`),
    blur: blurSchema.optional().describe(customDesc?.blur || `The blur effect applied to the ${type}. Currently, only "layer-blur" is supported.`),
    layoutChild: layoutChildSchema.optional().describe(
      customDesc?.layoutChild ||
      `Properties to position this ${type} inside a parent with layout type flex or grid.`
    ),
    layoutCell: layoutCellSchema.optional().describe(
      customDesc?.layoutCell ||
      `Properties to define the cell placement of this ${type} inside a parent with layout type grid.`
    ),
  };
}

function getChildShapeProperties(type, customDesc) {
  return {
    parentId: z.string().optional().describe(customDesc?.parentId || `The id of the parent board, group or component for the ${type}`),
  };
}

export const pathShapePropertiesSchema = z.object({
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

export const textShapePropertiesSchema = z.object({
  characters: z.string().describe('The characters to draw'),
  fontFamily: z.string().optional().describe('The font family of the text'),
  fontSize: z.number().optional().describe('The font size of the text'),
  fontWeight: z.number().optional().describe('The font weight of the text'),
  fontStyle: z.enum(['normal', 'italic']).optional().describe('The font style of the text'),
  lineHeight: z.number().min(0).max(10).optional().describe('The separation between lines of text'),
  letterSpacing: z.number().optional().describe('The letter spacing of the text'),
  textTransform: z.enum(['uppercase', 'lowercase', 'capitalize']).optional().describe('The text transform of the text'),
  textDecoration: z.enum(['underline', 'line-through']).optional().describe('The text decoration of the text'),
  direction: z.enum(['ltr', 'rtl']).optional().describe('The direction of the text'),
  align: z.enum(['left', 'center', 'right']).optional().describe('The align of the text'),
  verticalAlign: z.enum(['center']).optional().describe('The vertical align of the text'),
});

export const textRangePropertiesSchema = textShapePropertiesSchema
  .omit({ characters: true })
  .partial()
  .describe('Text style properties to apply to a text range');

export const baseShapeProperties = z.object(getBaseShapeProperties('shape'));

export const boardShapeSchema = z.object(getBaseShapeProperties('board'))
  .extend(getChildShapeProperties('board'))
  .extend({
    flex: flexLayoutSchema.optional().nullable().describe('Flex layout configuration applied to the board'),
    grid: gridLayoutSchema.optional().nullable().describe('Grid layout configuration applied to the board'),
    clipContent: z.boolean().optional().describe('Whether the board clips its children'),
    horizontalSizing: z.enum(['auto', 'fix']).optional().describe('The horizontal sizing behavior of the board. Auto means the board will size to fit its children width, fix means the board will be fixed width.'),
    verticalSizing: z.enum(['auto', 'fix']).optional().describe('The vertical sizing behavior of the board. Auto means the board will size to fit its children height, fix means the board will be fixed height.'),
  });

export const componentSchema = boardShapeSchema.extend({
  path: z.string().describe('The path of the library component.'),
});

export const groupShapeSchema = z.object(getBaseShapeProperties('group'))
  .extend(getChildShapeProperties('group'))

const shapeZIndexSchema = z.object({
  zIndex: z.number().min(0).optional().describe('The z-index (index) inside the parent. Higher values appear on top of lower values.'),
});

const rectangleShapeSchema = z.object(getBaseShapeProperties('rectangle'))
  .extend(getChildShapeProperties('rectangle'))
  .extend({
    type: z.literal('rectangle').describe('The type of shape: rectangle (always lowercase)'),
  });

const ellipseShapeSchema = z.object(getBaseShapeProperties('ellipse'))
  .extend(getChildShapeProperties('ellipse'))
  .extend({
    type: z.literal('ellipse').describe('The type of shape: ellipse (always lowercase)'),
  });

export const pathShapeSchema = z.object(getBaseShapeProperties('path'))
  .extend(getChildShapeProperties('path'))
  .extend(pathShapePropertiesSchema.shape)
  .extend({
    type: z.literal('path').describe('The type of shape: path (always lowercase)'),
  });

export const textShapeSchema = z.object(getBaseShapeProperties('text'))
  .extend(getChildShapeProperties('text'))
  .extend(textShapePropertiesSchema.shape)
  .extend({
    type: z.literal('text').describe('The type of shape: text (always lowercase)'),
  });

export const createShapesSchema = z.object({
  shapes: z.array(
    z.discriminatedUnion('type', [
      rectangleShapeSchema.merge(shapeZIndexSchema),
      ellipseShapeSchema.merge(shapeZIndexSchema),
      pathShapeSchema.merge(shapeZIndexSchema),
      textShapeSchema.merge(shapeZIndexSchema),
    ])
  ).optional().describe('Array of objects defining the shapes to create. Important !! type property is mandatory in all shape (always lowercase).'),
});

export const shapeIdsSchema = z.object({
  shapeIds: z.array(
    z.object({
      shapeId: z.string().describe('The ID of the shape to include'),
      zIndex: z.number().optional().describe('Optional zIndex for ordering; lower values appear first'),
    })
  ).optional().describe('IDs of EXISTING shapes to include (from get-current-page, get-selected-shapes, or previous create responses). For new shapes, use the shapes parameter instead.'),
});

export const createComponentSchema = shapeIdsSchema.partial()
  .extend(componentSchema.shape)
  .extend(createShapesSchema.shape)
  .refine(
    (data) =>
      (Array.isArray(data.shapeIds) && data.shapeIds.length > 0) ||
      (Array.isArray(data.shapes) && data.shapes.length > 0),
    { message: 'Provide at least one of shapeIds or shapes to create the component' }
  )
  .describe('Schema for creating a component from existing shapes, new shapes, or both. Use component properties to define the background fills, strokes, and shadows.');

export const createGroupSchema = groupShapeSchema
  .extend(shapeIdsSchema.shape)
  .extend(createShapesSchema.shape)
  .describe('shapeIds: existing shape IDs to group. shapes: new shapes to create inside the group. Use one or both.');

export const createBoardSchema = shapeIdsSchema.partial()
  .extend(boardShapeSchema.shape)
  .extend(createShapesSchema.shape)
  .describe('Schema for creating a board with existing shapes, new shapes, or both.');

export const convertGroupToBoardSchema = z.object({
  groupId: z.string().describe('The ID of the group to convert into a board'),
  properties: boardShapeSchema.partial().optional().describe('Optional board properties to apply after conversion'),
}).describe('Schema for converting an existing group into a board.');

export const convertGroupToComponentSchema = z.object({
  groupId: z.string().describe('The ID of the group to convert into a component'),
  name: z.string().optional().describe('Optional name for the new component'),
  properties: boardShapeSchema.partial().optional().describe('Optional component properties to apply after conversion'),
}).describe('Schema for converting an existing group into a component.');

export const convertBoardToComponentSchema = z.object({
  boardId: z.string().describe('The ID of the board to convert into a component'),
  name: z.string().optional().describe('Optional name for the new component'),
  properties: boardShapeSchema.partial().optional().describe('Optional component properties to apply after conversion'),
}).describe('Schema for converting an existing board into a component.');

export const createBooleanSchema = z.object({
  boolType: z.enum(['union', 'difference', 'exclude', 'intersection']).describe('The boolean operation: union (combine), difference (cut out), exclude (xor), intersection (keep overlap)'),
  shapeIds: z.array(z.string()).min(2).describe('Array of at least 2 shape IDs to perform the boolean operation on'),
}).merge(baseShapeProperties.partial()).describe('Schema for creating a boolean shape from existing shapes.');

export const ungroupShapeSchema = z.object({
  groupId: z.string().describe('The ID of the group to ungroup'),
}).describe('Schema for ungrouping a group.');

export const alignShapesSchema = z.object({
  shapeIds: z.array(z.string()).min(2).describe('Array of at least 2 shape IDs to align'),
  axis: z.enum(['horizontal', 'vertical']).describe('Axis along which to align'),
  direction: z.enum(['left', 'center', 'right', 'top', 'bottom']).describe('Horizontal: left, center, right. Vertical: top, center, bottom'),
}).refine(
  (input) => {
    if (input.axis === 'horizontal') {
      return ['left', 'center', 'right'].includes(input.direction);
    }
    return ['top', 'center', 'bottom'].includes(input.direction);
  },
  { message: 'Horizontal axis requires left/center/right; vertical requires top/center/bottom' }
).describe('Schema for aligning shapes.');

export const distributeShapesSchema = z.object({
  shapeIds: z.array(z.string()).min(2).describe('Array of at least 2 shape IDs to distribute'),
  axis: z.enum(['horizontal', 'vertical']).describe('Axis along which to distribute (equal spacing)'),
}).describe('Schema for distributing shapes with equal spacing.');

const triggerSchema = z.enum(['click', 'mouse-enter', 'mouse-leave', 'after-delay']);

const animationSchema = z.object({
  type: z.enum(['dissolve', 'slide', 'push']),
  duration: z.number().describe('Duration in milliseconds'),
  easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']).optional(),
  way: z.enum(['in', 'out']).optional().describe('For slide/push: in (out-to-in) or out (in-to-out)'),
  direction: z.enum(['right', 'left', 'up', 'down']).optional().describe('For slide/push'),
  offsetEffect: z.boolean().optional(),
}).optional();

const baseInteractionRefine = (schema) =>
  schema.refine(
    (input) => {
      if (input.trigger === 'after-delay') {
        return typeof input.delay === 'number' && input.delay >= 0;
      }
      return true;
    },
    { message: 'delay (ms, >= 0) is required when trigger is after-delay' }
  );

const baseInteractionFields = {
  shapeId: z.string().describe('ID of the shape that will trigger the interaction (e.g. button)'),
  trigger: triggerSchema.describe('When the action fires: click, mouse-enter, mouse-leave, after-delay'),
  delay: z.number().int().min(0).optional().describe('Milliseconds delay for after-delay trigger'),
};

export const addNavigateToInteractionSchema = baseInteractionRefine(
  z.object({
    ...baseInteractionFields,
    destinationBoardId: z.string().describe('ID of the board to navigate to'),
    preserveScrollPosition: z.boolean().optional(),
    animation: animationSchema,
  })
).describe('Add a navigate-to interaction: when triggered, goes to another board.');

export const addOverlayInteractionSchema = baseInteractionRefine(
  z.object({
    ...baseInteractionFields,
    destinationBoardId: z.string().describe('ID of the board to show as overlay'),
    relativeToShapeId: z.string().optional().describe('Position overlay relative to this shape'),
    position: z.enum(['manual', 'center', 'top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center']).default('center'),
    closeWhenClickOutside: z.boolean().optional(),
    addBackgroundOverlay: z.boolean().optional(),
    animation: animationSchema,
    manualPositionLocation: z.object({
      x: z.number().describe('The x-coordinate of the manual position'),
      y: z.number().describe('The y-coordinate of the manual position'),
    }).optional().describe('The manual position of the overlay. this parameter is mandatory when position is manual'),
  })
);

export const addCloseOverlayInteractionSchema = baseInteractionRefine(
  z.object({
    ...baseInteractionFields,
    destinationBoardId: z.string().optional().describe('Optional: close specific overlay by board ID'),
    animation: animationSchema.optional().describe('Optional; defaults to dissolve 300ms if omitted'),
  })
).describe('Add a close-overlay interaction: closes the current or specified overlay.');

export const addPreviousScreenInteractionSchema = baseInteractionRefine(
  z.object({
    ...baseInteractionFields,
  })
).describe('Add a previous-screen interaction: goes back to the previous screen in the flow.');

export const addOpenUrlInteractionSchema = baseInteractionRefine(
  z.object({
    ...baseInteractionFields,
    url: z.string().url().describe('URL to open in new tab'),
  })
).describe('Add an open-url interaction: opens a URL in a new browser tab.');

export const createFlowSchema = z.object({
  name: z.string().min(1).describe('Name for the flow (e.g. "Onboarding")'),
  boardId: z.string().describe('ID of the starting board for this flow'),
});

export const removeFlowSchema = z.object({
  flowName: z.string().min(1).describe('Name of the flow to remove'),
});

export const modifyBoardSchema = z.object({
  boardId: z.string().describe('The ID of the board to modify'),
  properties: boardShapeSchema.partial().describe('Board properties to modify. Provide only the fields you want to change. Use null to remove a property.'),
}).describe('Schema for modifying an existing board.');

export const modifyComponentSchema = z.object({
  componentId: z.string().describe('The ID of the component to modify (library component id or component instance id)'),
  properties: componentSchema.partial().describe('Component properties to modify. Provide only the fields you want to change. Use null to remove a property.'),
}).describe('Schema for modifying an existing component.');

export const modifyShapePropertiesSchema = z.object({
  shapeId: z.string().describe('The ID of the shape to modify'),
})
  .extend(baseShapeProperties.partial().shape)
  .extend(pathShapePropertiesSchema.partial().shape)
  .extend(textShapePropertiesSchema.partial().shape);

export const modifyTextRangeSchema = z.object({
  shapeId: z.string().describe('The ID of the text shape to modify'),
  start: z.number().int().min(0).describe('Start index (inclusive) of the text range'),
  end: z.number().int().min(0).describe('End index (exclusive) of the text range'),
  props: textRangePropertiesSchema.describe('Text properties to apply to the range'),
});

export const rotateShapeSchema = z.object({
  shapeId: z.string().describe('The ID of the shape to rotate'),
  angle: z.number().describe('Rotation angle in degrees'),
  center: z.object({
    x: z.number().describe('The x-coordinate of the rotation center'),
    y: z.number().describe('The y-coordinate of the rotation center'),
  }).nullable().optional().describe('Optional rotation center; omit or pass null to rotate around the shape center'),
});

export const cloneShapeSchema = z.object({
  shapeId: z.string().describe('The ID of the shape to clone'),
  x: z.number().optional().describe('Optional x coordinate for the cloned shape'),
  y: z.number().optional().describe('Optional y coordinate for the cloned shape'),
  width: z.number().optional().describe('Optional width for the cloned shape'),
  height: z.number().optional().describe('Optional height for the cloned shape'),
});

export const reorderShapeSchema = z.object({
  shapeId: z.string().describe('The ID of the shape to reorder'),
});
