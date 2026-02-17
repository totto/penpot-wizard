/**
 * Converts an array of PathCommand objects to an SVG path string.
 * This is necessary because Penpot's plugin API only accepts SVG strings for path content,
 * not the PathCommand[] array format.
 * 
 * @param commands - Array of PathCommand objects
 * @returns SVG path string (e.g., "M50,50 L150,50 L100,150 Z")
 * 
 * @example
 * ```js
 * const commands = [
 *   { command: 'move-to', params: { x: 50, y: 50 } },
 *   { command: 'line-to', params: { x: 150, y: 50 } },
 *   { command: 'close-path' }
 * ];
 * const svgPath = pathCommandsToSvgString(commands);
 * // Returns: "M50,50 L150,50 Z"
 * ```
 */
import { 
  baseShapeProperties,
  boardShapeSchema,
  pathShapeSchema,
  textShapeSchema,
} from '../types/shapeTypes';

export function pathCommandsToSvgString(commands) {
  return commands.map(cmd => {
    const params = cmd.params;
    
    // Normalize command to short form
    const command = cmd.command;
    
    switch (command) {
      case 'M':
      case 'move-to':
        return `M${params?.x},${params?.y}`;
      
      case 'L':
      case 'line-to':
        return `L${params?.x},${params?.y}`;
      
      case 'H':
      case 'line-to-horizontal':
        return `H${params?.x}`;
      
      case 'V':
      case 'line-to-vertical':
        return `V${params?.y}`;
      
      case 'C':
      case 'curve-to':
        return `C${params?.c1x},${params?.c1y} ${params?.c2x},${params?.c2y} ${params?.x},${params?.y}`;
      
      case 'S':
      case 'smooth-curve-to':
        return `S${params?.c2x},${params?.c2y} ${params?.x},${params?.y}`;
      
      case 'Q':
      case 'quadratic-bezier-curve-to':
        return `Q${params?.c1x},${params?.c1y} ${params?.x},${params?.y}`;
      
      case 'T':
      case 'smooth-quadratic-bezier-curve-to':
        return `T${params?.x},${params?.y}`;
      
      case 'A':
      case 'elliptical-arc':
        return `A${params?.rx},${params?.ry} ${params?.xAxisRotation || 0} ${params?.largeArcFlag ? 1 : 0},${params?.sweepFlag ? 1 : 0} ${params?.x},${params?.y}`;
      
      case 'Z':
      case 'close-path':
        return 'Z';
      
      default:
        console.warn(`Unknown path command: ${command}`);
        return '';
    }
  }).join(' ');
}

/**
 * Properties that can be copied from a shape to a board
 */
const COPYABLE_BOARD_PROPERTIES = [
  'name',
  'x',
  'y',
  'rotation',
  'flipX',
  'flipY',
  'borderRadius',
  'opacity',
  'blendMode',
  'fills',
  'strokes',
  'shadows',
  'blur',
];

/**
 * Converts any shape to a board while preserving its properties and children.
 * This is useful when you need to apply flex or grid layouts to shapes that
 * don't support addFlexLayout/addGridLayout methods (like groups).
 * 
 * @param shape - The shape to convert to a board
 * @returns The new board with the same properties and children
 * 
 * @example
 * ```js
 * const group = penpot.currentPage?.getShapeById(groupId);
 * const board = convertToBoard(group);
 * // Now you can add flex/grid layout to the board
 * board.addFlexLayout();
 * ```
 */
export function convertToBoard(shape) {
  if (!shape) {
    throw new Error('Shape is required for conversion to board');
  }

  // If it's already a board, return it as-is
  if (shape.type === 'board') {
    return shape;
  }

  // Store original properties
  const originalProps = {};
  for (const key of COPYABLE_BOARD_PROPERTIES) {
    if (shape[key]) {
      originalProps[key] = shape[key];
    }
  }

  // Store original dimensions
  const _width = shape.width;
  const _height = shape.height;

  // Get the parent before we modify anything
  const parent = shape.parent;

  // Get children if the shape has any (groups have children)
  const children = shape.children ? [...shape.children] : [];

  // Create new board
  const board = penpot.createBoard();
  if (!board) {
    throw new Error('Failed to create board');
  }

  // Copy properties to board
  for (const [key, value] of Object.entries(originalProps)) {
    if (value !== undefined) {
      board[key] = value;
    }
  }

  // Move children to the new board (if any)
  for (const child of children) {
    board.appendChild(child);
  }

  // If the original shape had a parent, add the board to that parent
  if (parent && parent.appendChild) {
    parent.appendChild(board);
  }

  board.horizontalSizing = 'auto';
  board.verticalSizing = 'auto';
  
  // Remove the original shape
  shape.remove();

  return board;
}

/**
 * Curates a shape object by keeping only configurable properties
 * based on the shape type schemas from shapeTypes.js.
 */
export function curateShapeOutput(shape) {
  if (!shape || typeof shape !== 'object') {
    return shape;
  }

  const shapeRecord = shape;
  const shapeType = shapeRecord.type;
  const shapeId = shapeRecord.id;
  
  if (!shapeType) {
    return shapeId ? { id: shapeId } : {};
  }

  let validSchema;
  
  switch (shapeType) {
    case 'path':
      validSchema = pathShapeSchema;
      break;
    case 'text':
      validSchema = textShapeSchema;
      break;
    case 'rectangle':
    case 'ellipse':
    default:
      validSchema = baseShapeProperties;
      break;
    case 'board':
      validSchema = boardShapeSchema;
      break;
  }

  const schemaShape = validSchema.shape;
  const validKeys = new Set(Object.keys(schemaShape));
  
  validKeys.add('id');
  validKeys.add('type');

  let parentId;
  const parent = shapeRecord.parent;
  if (parent) {
    if (typeof parent === 'object' && parent !== null && 'id' in parent) {
      parentId = parent.id;
    } else if (typeof parent === 'string') {
      parentId = parent;
    }
  } else if ('parentId' in shapeRecord && typeof shapeRecord.parentId === 'string') {
    parentId = shapeRecord.parentId;
  }

  const curated = {
    id: shapeId,
    type: shapeType,
  };

  if (parentId) {
    curated.parentId = parentId;
  }

  for (const key of validKeys) {
    if (key === 'id' || key === 'type' || key === 'parentId') {
      continue;
    }

    if (key in shapeRecord && shapeRecord[key] !== undefined) {
      curated[key] = shapeRecord[key];
    }
  }

  return curated;
}

