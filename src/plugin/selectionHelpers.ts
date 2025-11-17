import { SelectionInfoItem } from '../types/types';

/**
 * Safe, read-only selection helper
 * - Returns a plain, serializable array of selection info for the currently selected shapes.
 * - Must NOT be used to perform any modifications.
 * - This is safe for AI agents and tools that only need information about the selection.
 */
export function readSelectionInfo(): SelectionInfoItem[] {
  console.log('📊 readSelectionInfo called - safe read-only selection access');

  try {
  // Use penpot.selection for fast access in the host environment.
  // If it doesn't exist, fallback to current page selected shapes (non-action read-only only).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selection = (penpot as any).selection ?? (penpot.currentPage as any)?.getSelectedShapes?.();
    if (!selection || !Array.isArray(selection) || selection.length === 0) {
      console.log('❌ No selection available for info reading');
      return [];
    }

    // Only read properties; do not mutate. This ensures we don't trigger selection-related crashes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: SelectionInfoItem[] = (selection as any[]).map((shape: any) => ({
      id: String(shape.id ?? ''),
      name: shape.name ?? undefined,
      type: shape.type ?? 'unknown',
      x: typeof shape.x === 'number' ? shape.x : 0,
      y: typeof shape.y === 'number' ? shape.y : 0,
      width: typeof shape.width === 'number' ? shape.width : 0,
      height: typeof shape.height === 'number' ? shape.height : 0,
      rotation: typeof shape.rotation === 'number' ? shape.rotation : undefined,
      opacity: typeof shape.opacity === 'number' ? shape.opacity : undefined,
    }));

    console.log(`✅ Read info for ${info.length} selected shapes`);
    return info;
  } catch (err) {
    console.warn('❌ Error reading selection info in readSelectionInfo:', err);
    return [];
  }
}
