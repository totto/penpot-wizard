import { z } from 'zod';

const gradientStopSchema = z.object({
  color: z.string(),
  opacity: z.number().min(0).max(1).optional(),
  offset: z.number(),
});

const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']),
  startX: z.number().min(0).max(1),
  startY: z.number().min(0).max(1),
  endX: z.number().min(0).max(1),
  endY: z.number().min(0).max(1),
  width: z.number(),
  stops: z.array(gradientStopSchema),
}).describe(`
  Use startX, startY to define the coordinates of the starting point of the gradient
  Use endX, endY to define the coordinates of the ending point of the gradient
  examples:
  -type linear: 
    --(0.5,0) -> (0.5,1) starts at top center and goes to bottom center
    --(0,0.5) -> (1,0.5) starts at left center and goes to right center
  -type radial: 
    --(0.5,0.5) -> (1,1) starts at center and goes to the bottom right corner
    --(0.5,0.5) -> (0,0) starts at center and goes to the top left corner
`);

const imageDataSchema = z.object({
  name: z.string().optional(),
  width: z.number(),
  height: z.number(),
  mtype: z.string(),
  id: z.string(),
  keepAspectRatio: z.boolean().optional(),
});

export const Fill = z.object({
  fillColor: z.string().optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  fillColorGradient: gradientSchema.optional(),
  fillColorRefFile: z.string().optional(),
  fillColorRefId: z.string().optional(),
  fillImage: imageDataSchema.optional(),
});

const strokeCapValues = [
  'round', 'square', 'line-arrow', 'triangle-arrow',
  'square-marker', 'circle-marker', 'diamond-marker',
];

export const Stroke = z.object({
  strokeColor: z.string().optional(),
  strokeColorRefFile: z.string().optional(),
  strokeColorRefId: z.string().optional(),
  strokeOpacity: z.number().min(0).max(1).optional(),
  strokeStyle: z.enum(['svg', 'none', 'mixed', 'solid', 'dotted', 'dashed']).optional(),
  strokeWidth: z.number().optional(),
  strokeAlignment: z.enum(['center', 'inner', 'outer']).optional(),
  strokeCapStart: z.enum(strokeCapValues).optional(),
  strokeCapEnd: z.enum(strokeCapValues).optional(),
  strokeColorGradient: gradientSchema.optional(),
});

const colorSchema = z.object({
  id: z.string().optional(),
  fileId: z.string().optional(),
  name: z.string().optional(),
  path: z.string().optional(),
  color: z.string().optional().describe('The color in RGB format. IMPORTANT!! DO NOT USE RGBA FORMAT, use opacity property instead.'),
  opacity: z.number().min(0).max(1).optional(),
  refId: z.string().optional(),
  refFile: z.string().optional(),
  gradient: gradientSchema.optional(),
  image: imageDataSchema.optional(),
});

export const Shadow = z.object({
  style: z.enum(['drop-shadow', 'inner-shadow']).optional(),
  'offset-x': z.number().optional(),
  'offset-y': z.number().optional(),
  blur: z.number().optional(),
  spread: z.number().optional(),
  hidden: z.boolean().optional(),
  color: colorSchema.optional(),
});

export const Blur = z.object({
  type: z.enum(['layer-blur']).optional(),
  value: z.number().optional(),
  hidden: z.boolean().optional(),
});

export const LayoutCellProperties = z.object({
  row: z.number().optional(),
  rowSpan: z.number().optional(),
  column: z.number().optional(),
  columnSpan: z.number().optional(),
  areaName: z.string().optional(),
  position: z.enum(['area', 'auto', 'manual']).optional(),
});

const CommonLayoutProperties = z.object({
  alignItems: z.enum(['start', 'end', 'center', 'stretch']).optional(),
  alignContent: z.enum(['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional(),
  justifyItems: z.enum(['start', 'end', 'center', 'stretch']).optional(),
  justifyContent: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional(),
  rowGap: z.number().optional(),
  columnGap: z.number().optional(),
  verticalPadding: z.number().optional(),
  horizontalPadding: z.number().optional(),
  topPadding: z.number().optional(),
  rightPadding: z.number().optional(),
  bottomPadding: z.number().optional(),
  leftPadding: z.number().optional(),
  layoutHorizontalSizing: z.enum(['fit-content', 'fill', 'auto']).optional(),
  layoutVerticalSizing: z.enum(['fit-content', 'fill', 'auto']).optional(),
});

const Track = z.object({
  type: z.enum(['flex', 'fixed', 'percent', 'auto']),
  value: z.number().nullable(),
});

export const FlexLayoutProperties = CommonLayoutProperties.extend({
  dir: z.enum(['row', 'row-reverse', 'column', 'column-reverse']),
  wrap: z.enum(['wrap', 'nowrap']).optional(),
});

export const GridLayoutProperties = CommonLayoutProperties.extend({
  dir: z.enum(['column', 'row']),
  rows: z.array(Track).optional(),
  columns: z.array(Track).optional(),
});

export const LayoutChildProperties = z.object({
  absolute: z.boolean().optional(),
  zIndex: z.number().optional(),
  horizontalSizing: z.enum(['fill', 'auto', 'fix']).optional(),
  verticalSizing: z.enum(['fill', 'auto', 'fix']).optional(),
  alignSelf: z.enum(['center', 'auto', 'start', 'end', 'stretch']).optional(),
  horizontalMargin: z.number().optional(),
  verticalMargin: z.number().optional(),
  topMargin: z.number().optional(),
  rightMargin: z.number().optional(),
  bottomMargin: z.number().optional(),
  leftMargin: z.number().optional(),
  maxWidth: z.number().nullable().optional(),
  maxHeight: z.number().nullable().optional(),
  minWidth: z.number().nullable().optional(),
  minHeight: z.number().nullable().optional(),
}).describe(`
  IMPORTANT!! use zIndex to define the position of the element into a flex layout
  if the flex layout dir is row, the element with higher zIndex appears on the left
  if the flex dir is column, the element with higher zIndex appears on the top.
`);

const pathCommandParamsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  c1x: z.number().optional(),
  c1y: z.number().optional(),
  c2x: z.number().optional(),
  c2y: z.number().optional(),
  rx: z.number().optional(),
  ry: z.number().optional(),
  xAxisRotation: z.number().optional(),
  largeArcFlag: z.boolean().optional(),
  sweepFlag: z.boolean().optional(),
});

export const PathCommand = z.object({
  command: z.enum([
    'M', 'move-to', 'Z', 'close-path', 'L', 'line-to', 'H', 'line-to-horizontal',
    'V', 'line-to-vertical', 'C', 'curve-to', 'S', 'smooth-curve-to',
    'Q', 'quadratic-bezier-curve-to', 'T', 'smooth-quadratic-bezier-curve-to',
    'A', 'elliptical-arc',
  ]),
  params: pathCommandParamsSchema.optional(),
});

export const blendModeValues = [
  'difference', 'normal', 'darken', 'multiply', 'color-burn', 'lighten', 'screen',
  'color-dodge', 'overlay', 'soft-light', 'hard-light', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
];

export const removableProperties = [
  'fills',
  'strokes',
  'shadows',
  'blur',
  'grid',
  'flex',
  'interactions',
];

