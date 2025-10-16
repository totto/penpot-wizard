import { PathCommand } from "@penpot/plugin-types";

/**
 * Converts an array of PathCommand objects to an SVG path string.
 * This is necessary because Penpot's plugin API only accepts SVG strings for path content,
 * not the PathCommand[] array format.
 * 
 * @param commands - Array of PathCommand objects
 * @returns SVG path string (e.g., "M50,50 L150,50 L100,150 Z")
 * 
 * @example
 * ```ts
 * const commands: PathCommand[] = [
 *   { command: 'move-to', params: { x: 50, y: 50 } },
 *   { command: 'line-to', params: { x: 150, y: 50 } },
 *   { command: 'close-path' }
 * ];
 * const svgPath = pathCommandsToSvgString(commands);
 * // Returns: "M50,50 L150,50 Z"
 * ```
 */
export function pathCommandsToSvgString(commands: PathCommand[]): string {
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
