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
  pathShapeProperties,
  textShapeProperties,
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
      validSchema = pathShapeProperties;
      break;
    case 'text':
      validSchema = textShapeProperties;
      break;
    case 'rectangle':
    case 'ellipse':
    case 'board':
    default:
      validSchema = baseShapeProperties;
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

