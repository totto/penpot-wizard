import type { PathCommand } from '@penpot/plugin-types';
import { pathCommandsToSvgString } from './utils';

/**
 * Examples of using PathCommand[] -> SVG string parser
 * 
 * These examples show how to create different shapes using PathCommand[]
 * and convert them to SVG strings that Penpot can use.
 */

// Example 1: Triangle
export const triangleExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 50 } },
  { command: 'line-to', params: { x: 150, y: 50 } },
  { command: 'line-to', params: { x: 100, y: 150 } },
  { command: 'close-path' },
];
// Result: "M50,50 L150,50 L100,150 Z"

// Example 2: Rectangle
export const rectangleExample: PathCommand[] = [
  { command: 'move-to', params: { x: 0, y: 0 } },
  { command: 'line-to', params: { x: 100, y: 0 } },
  { command: 'line-to', params: { x: 100, y: 50 } },
  { command: 'line-to', params: { x: 0, y: 50 } },
  { command: 'close-path' },
];
// Result: "M0,0 L100,0 L100,50 L0,50 Z"

// Example 3: Bezier Curve (simplified heart)
export const heartExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 30 } },
  { command: 'curve-to', params: { 
    c1x: 50, c1y: 10, 
    c2x: 20, c2y: 10, 
    x: 20, y: 30 
  }},
  { command: 'curve-to', params: { 
    c1x: 20, c1y: 50, 
    c2x: 50, c2y: 70, 
    x: 50, y: 90 
  }},
  { command: 'curve-to', params: { 
    c1x: 50, c1y: 70, 
    c2x: 80, c2y: 50, 
    x: 80, y: 30 
  }},
  { command: 'curve-to', params: { 
    c1x: 80, c1y: 10, 
    c2x: 50, c2y: 10, 
    x: 50, y: 30 
  }},
  { command: 'close-path' },
];

// Example 4: 5-pointed star
export const starExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 0 } },
  { command: 'line-to', params: { x: 61, y: 35 } },
  { command: 'line-to', params: { x: 98, y: 35 } },
  { command: 'line-to', params: { x: 68, y: 57 } },
  { command: 'line-to', params: { x: 79, y: 91 } },
  { command: 'line-to', params: { x: 50, y: 70 } },
  { command: 'line-to', params: { x: 21, y: 91 } },
  { command: 'line-to', params: { x: 32, y: 57 } },
  { command: 'line-to', params: { x: 2, y: 35 } },
  { command: 'line-to', params: { x: 39, y: 35 } },
  { command: 'close-path' },
];

// Example 5: Zigzag line (without closing)
export const zigzagExample: PathCommand[] = [
  { command: 'move-to', params: { x: 0, y: 50 } },
  { command: 'line-to', params: { x: 25, y: 25 } },
  { command: 'line-to', params: { x: 50, y: 50 } },
  { command: 'line-to', params: { x: 75, y: 25 } },
  { command: 'line-to', params: { x: 100, y: 50 } },
];
// No close-path, remains open

// Example 6: Elliptical arc
export const arcExample: PathCommand[] = [
  { command: 'move-to', params: { x: 10, y: 50 } },
  { command: 'elliptical-arc', params: {
    rx: 40,
    ry: 40,
    xAxisRotation: 0,
    largeArcFlag: false,
    sweepFlag: true,
    x: 90,
    y: 50
  }},
];

// Helper function to test the examples
export function testPathExamples() {
  console.log('=== PATH COMMAND EXAMPLES ===\n');
  
  console.log('Triangle:', pathCommandsToSvgString(triangleExample));
  console.log('Rectangle:', pathCommandsToSvgString(rectangleExample));
  console.log('Heart:', pathCommandsToSvgString(heartExample));
  console.log('Star:', pathCommandsToSvgString(starExample));
  console.log('Zigzag:', pathCommandsToSvgString(zigzagExample));
  console.log('Arc:', pathCommandsToSvgString(arcExample));
}

