import { SelectionInfoItem } from '../types/types';

/**
 * Safe, read-only selection helper
 * - Returns a plain, serializable array of selection info for the currently selected shapes.
 * - Must NOT be used to perform any modifications.
 * - This is safe for AI agents and tools that only need information about the selection.
 */
/**
 * NOTE: This helper is intentionally independent and read-only.
 * - It must not import or call any action-performing tools or helpers (e.g., resize, group).
 * - It can be used by tools and agents to retrieve read-only data about the selection.
 * - If you need to mutate selection, call the action tool that uses getSelectionForAction() instead.
 */
export function readSelectionInfo(): SelectionInfoItem[] {
  console.log('📊 readSelectionInfo called - safe read-only selection access');

  try {
  // Use penpot.selection for fast access in the host environment.
  // If it doesn't exist, or if penpot.selection is present but empty, fall back to
  // currentPage.getSelectedShapes(). Some host runtimes briefly expose an empty
  // penpot.selection while the page selection APIs still return the selected shapes —
  // prefer a non-empty selection when possible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let selection = (penpot as any).selection;
  try {
    const pageFallback = (penpot.currentPage as any)?.getSelectedShapes?.();
    if ((!selection || !Array.isArray(selection) || selection.length === 0) && Array.isArray(pageFallback) && pageFallback.length > 0) {
      selection = pageFallback;
    }
  } catch {
    // silent - fall through to selection as captured
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
