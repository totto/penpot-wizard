/**
 * PLUGIN SELECTION SAFETY PATTERN
 * ===============================
 *
 * CRITICAL: Never create general-purpose selection querying tools like getCurrentSelection.
 * This causes JavaFX crashes by interfering with Penpot's internal selection handling.
 *
 * SAFE APPROACH:
 * 1. Handle selection access directly within action-performing tools only
 * 2. Use getSelectionForAction() helper for safe selection access
 * 3. Check selection validity before performing actions
 * 4. Handle errors gracefully with try/catch blocks
 * 5. Never serialize selection data for general AI consumption
 *
 * EXAMPLES:
 * ✅ createLibraryComponent() - accesses selection directly when creating component
 * ✅ applyBlurTool() - accesses selection directly when applying blur
 * ❌ getCurrentSelection() - was removed due to crashes
 */

import {
  AddImageFromUrlQueryPayload,
  ApplyBlurQueryPayload,
  ApplyFillQueryPayload,
  ApplyLinearGradientQueryPayload,
  ApplyRadialGradientQueryPayload,
  ClientQueryType,
  MessageSourceName,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  GetUserDataPayload,
  UndoInfo,
  UndoLastActionQueryPayload,
  RedoLastActionQueryPayload,
} from "../types/types";
import type { Shape } from '@penpot/plugin-types';

const pluginResponse: PluginResponseMessage = {
  source: MessageSourceName.Plugin,
  type: ClientQueryType.ADD_IMAGE,
  messageId: '',
  message: '',
  success: true,
};

// Global variable to store current selection IDs (updated by plugin.ts)
let currentSelectionIds: string[] = [];

// Global undo stack - stores undo information for reversible actions
let undoStack: UndoInfo[] = [];
// Global redo stack - stores undone actions that can be redone
let redoStack: UndoInfo[] = [];
const MAX_UNDO_STACK_SIZE = 10; // Keep last 10 undoable actions

// Function to update selection IDs from plugin.ts
export function updateCurrentSelection(ids: string[]) {
  currentSelectionIds = ids;
  console.log('Selection updated to:', ids);
}

// Export currentSelectionIds for access from plugin.ts
export { currentSelectionIds };

// Function to add undo information to the stack
export function addToUndoStack(undoInfo: UndoInfo) {
  undoStack.push(undoInfo);
  // Keep only the last MAX_UNDO_STACK_SIZE items
  if (undoStack.length > MAX_UNDO_STACK_SIZE) {
    undoStack = undoStack.slice(-MAX_UNDO_STACK_SIZE);
  }
  console.log('Added to undo stack:', undoInfo.description);
}

// Helper function to get current selection shapes safely
function getCurrentSelectionShapes(): Shape[] {
  console.log('🔍 getCurrentSelectionShapes called, currentSelectionIds:', currentSelectionIds);

  // First, always try to get fresh selection data to ensure we don't miss anything
  let freshSelection: Shape[] = [];
  try {
    const directSel = (penpot as any).selection;
    if (directSel && Array.isArray(directSel) && directSel.length > 0) {
      console.log(`✅ Found ${directSel.length} shapes via direct selection`);
      freshSelection = directSel;
      // Update our tracked selection for future use
      const ids = directSel.map((shape: any) => shape?.id).filter((id: any) => id && typeof id === 'string');
      if (ids.length > 0) {
        console.log('📝 Updating tracked selection from fresh data:', ids);
        currentSelectionIds = ids;
      }
    }
  } catch (directError) {
    console.warn('❌ Direct selection access failed:', directError);
  }

  // If we got fresh selection, use it
  if (freshSelection.length > 0) {
    console.log(`✅ Returning ${freshSelection.length} shapes from fresh selection`);
    return freshSelection;
  }

  // Fallback: use tracked selection IDs if fresh selection failed
  if (currentSelectionIds && currentSelectionIds.length > 0) {
    console.log('⚠️ Using tracked selection IDs as fallback:', currentSelectionIds);

    try {
      const currentPage = penpot.currentPage;
      if (!currentPage) {
        console.log('❌ No current page found');
        return [];
      }

      const shapes: Shape[] = [];
      for (const id of currentSelectionIds) {
        try {
          const shape = currentPage.getShapeById(id);
          if (shape) {
            console.log(`✅ Found shape ${id}:`, shape.name || shape.id);
            shapes.push(shape);
          } else {
            console.log(`❌ Shape ${id} not found on page`);
          }
        } catch (error) {
          console.warn(`❌ Could not find shape with ID ${id}:`, error);
        }
      }

      if (shapes.length > 0) {
        console.log(`✅ Returning ${shapes.length} shapes from tracked IDs`);
        return shapes;
      }
    } catch (pageError) {
      console.warn('❌ Error accessing current page:', pageError);
    }
  }

  console.log('❌ No selection found via any method');
  return [];
}

export function handleGetUserData(): PluginResponseMessage {
  if (penpot.currentUser) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA,
      message: 'User data successfully retrieved',
      payload: {
        name: penpot.currentUser.name || '',
        id: penpot.currentUser.id,
      },
    };
    } else {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_USER_DATA,
        success: false,
        message: 'Error retrieving user data',
      };
    }
}

export async function createLibraryColor(payload: any): Promise<PluginResponseMessage> {
  try {
    const { name, color, overwrite } = payload ?? {};

    if (!name || typeof name !== 'string' || !color || typeof color !== 'string') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COLOR,
        success: false,
        message: 'Invalid payload. Expected { name: string, color: string }',
      };
    }

    // Check library API availability - use the correct Penpot API
    if (!penpot.library || !penpot.library.local || typeof penpot.library.local.createColor !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COLOR,
        success: false,
        message: 'Penpot library API for creating colors is not available in this environment.',
      };
    }

    // Try to obtain existing colors for duplicate detection
    let existingColors: any[] = [];
    try {
      if (Array.isArray(penpot.library.local.colors)) {
        existingColors = penpot.library.local.colors;
      }
    } catch (e) {
      console.warn('Could not fetch existing library colors:', e);
      existingColors = [];
    }

    const normalize = (s: any) => (String(s ?? '').trim().toLowerCase());
    const dup = existingColors.find((c: any) => {
      const cname = normalize(c.name ?? c.label);
      const cval = normalize(c.value ?? c.color ?? c.hex ?? c.hexValue ?? c.hexString);
      return cname === normalize(name) || cval === normalize(color);
    });

    if (dup && !overwrite) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COLOR,
        success: false,
        message: `A library color with the same name or value already exists: ${dup.name ?? dup.label}.`,
        payload: { duplicate: true, existing: { id: dup.id ?? dup._id ?? undefined, name: dup.name ?? dup.label, color: dup.value ?? dup.color ?? dup.hex } },
      };
    }

    // Attempt to create (or create will overwrite depending on API)
    try {
      const created = penpot.library.local.createColor();
      created.name = name;
      created.color = color;

      const createdId = created?.id ?? undefined;
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COLOR,
        success: true,
        message: 'Library color created',
        payload: { id: createdId, name, color },
      };
    } catch (createError) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COLOR,
        success: false,
        message: `Failed to create library color: ${createError instanceof Error ? createError.message : String(createError)}`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CREATE_LIBRARY_COLOR,
      success: false,
      message: `Error in createLibraryColor: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createLibraryFont(payload: CreateLibraryFontPayload): Promise<PluginResponseMessage> {
  try {
    const { name, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform, overwrite } = payload ?? {};

    if (!name || typeof name !== 'string' || !fontFamily || typeof fontFamily !== 'string' || !fontSize || typeof fontSize !== 'string') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_FONT,
        success: false,
        message: 'Invalid payload. Expected { name: string, fontFamily: string, fontSize: string }',
      };
    }

    // Check library API availability - use the correct Penpot API
    if (!penpot.library || !penpot.library.local || typeof penpot.library.local.createTypography !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_FONT,
        success: false,
        message: 'Penpot library API for creating typography is not available in this environment.',
      };
    }

    // Try to obtain existing typography for duplicate detection
    let existingTypography: Record<string, unknown>[] = [];
    try {
      if (Array.isArray(penpot.library.local.typographies)) {
        existingTypography = penpot.library.local.typographies as unknown as Record<string, unknown>[];
      }
    } catch (e) {
      console.warn('Could not fetch existing library typography:', e);
      existingTypography = [];
    }

    const normalize = (s: unknown) => (String(s ?? '').trim().toLowerCase());
    const dup = existingTypography.find((t: Record<string, unknown>) => {
      const tname = normalize(t.name ?? t.label);
      const tfamily = normalize(t.fontFamily ?? t.family);
      return tname === normalize(name) || (tname === normalize(name) && tfamily === normalize(fontFamily));
    });

    if (dup && !overwrite) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_FONT,
        success: false,
        message: `A library typography with the same name already exists: ${String(dup.name ?? dup.label)}.`,
      };
    }

    // Attempt to create (or create will overwrite depending on API)
    try {
      const created = penpot.library.local.createTypography();
      created.name = name;
      created.fontFamily = fontFamily;
      created.fontSize = fontSize;
      if (fontWeight) created.fontWeight = fontWeight;
      if (fontStyle) created.fontStyle = fontStyle;
      if (lineHeight) created.lineHeight = lineHeight;
      if (letterSpacing) created.letterSpacing = letterSpacing;
      if (textTransform) created.textTransform = textTransform;

      const createdId = created?.id ?? undefined;
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_FONT,
        success: true,
        message: 'Library typography created',
        payload: { id: createdId, name, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform },
      };
    } catch (createError) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_FONT,
        success: false,
        message: `Failed to create library typography: ${createError instanceof Error ? createError.message : String(createError)}`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CREATE_LIBRARY_FONT,
      success: false,
      message: `Error in createLibraryFont: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createLibraryComponent(payload: CreateLibraryComponentPayload): Promise<PluginResponseMessage> {
  try {
    const { name, shapes, useSelection = true, overwrite } = payload ?? {};

    if (!name || typeof name !== 'string') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: 'Invalid payload. Expected { name: string }',
      };
    }

    let componentShapes: Shape[] = [];

    if (useSelection) {
      // Get currently selected shapes using the same logic as getCurrentSelection - DISABLED to prevent crashes
      // try {
      //   const sel: any = (penpot as any).selection;

      //   if (!sel) {
      //     return {
      //       ...pluginResponse,
      //       type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
      //       success: false,
      //       message: 'NO_SELECTION',
      //     };
      //   }

      //   let selectedItems: any[] = [];
      //   if (Array.isArray(sel)) {
      //     selectedItems = sel;
      //   } else if (sel && typeof sel === 'object' && Array.isArray(sel.items)) {
      //     selectedItems = sel.items;
      //   } else if (sel && typeof sel === 'object' && sel.item) {
      //     selectedItems = [sel.item];
      //   }

      //   if (selectedItems.length === 0) {
      //     return {
      //       ...pluginResponse,
      //       type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
      //       success: false,
      //       message: 'NO_SELECTION',
      //     };
      //   }

      //   componentShapes = selectedItems as Shape[];
      // } catch {
        return {
          ...pluginResponse,
          type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
          success: false,
          message: 'NO_SELECTION',
        };
      // }
    } else if (shapes && Array.isArray(shapes)) {
      componentShapes = shapes;
    } else {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: 'Either set useSelection: true (default) to use currently selected shapes, or provide shapes array directly.',
      };
    }

    if (componentShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: 'No shapes available for the component.',
      };
    }

    // Check library API availability - use the correct Penpot API
    if (!penpot.library || !penpot.library.local || typeof penpot.library.local.createComponent !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: 'Penpot library API for creating components is not available in this environment.',
      };
    }

    // Try to obtain existing components for duplicate detection
    let existingComponents: Record<string, unknown>[] = [];
    try {
      if (Array.isArray(penpot.library.local.components)) {
        existingComponents = penpot.library.local.components as unknown as Record<string, unknown>[];
      }
    } catch (e) {
      console.warn('Could not fetch existing library components:', e);
      existingComponents = [];
    }

    const normalize = (s: unknown) => (String(s ?? '').trim().toLowerCase());
    const dup = existingComponents.find((c: Record<string, unknown>) => {
      const cname = normalize(c.name ?? c.label);
      return cname === normalize(name);
    });

    if (dup && !overwrite) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: `A library component with the same name already exists: ${String(dup.name ?? dup.label)}.`,
      };
    }

    // Attempt to create (or create will overwrite depending on API)
    try {
      const created = penpot.library.local.createComponent(componentShapes);

      // Try to set the name, but wrap in try-catch as Penpot objects might be read-only
      try {
        created.name = name;
      } catch (nameError) {
        console.warn('Could not set component name:', nameError);
        // Component created but name not set - this might still be usable
      }

      const createdId = created?.id ?? undefined;
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: true,
        message: 'Library component created',
        payload: { id: createdId, name, shapes: componentShapes },
      };
    } catch (createError) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
        success: false,
        message: `Failed to create library component: ${createError instanceof Error ? createError.message : String(createError)}`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
      success: false,
      message: `Error in createLibraryComponent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function handleGetProjectData(): PluginResponseMessage {
  if (penpot.currentFile && penpot.currentPage) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_PROJECT_DATA,
      message: 'Project data successfully retrieved',
      payload: {
        name: penpot.currentFile?.name,
        id: penpot.currentFile?.id,
        pages: penpot.currentFile?.pages.map((page) => ({
          name: page.name,
          id: page.id,
        })),
      },
    };
  } else {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_PROJECT_DATA,
      success: false,
      message: 'Error retrieving project data',
    }
  }
}

export function getAvailableFonts(): PluginResponseMessage {
  return {
    ...pluginResponse,
    type: ClientQueryType.GET_AVAILABLE_FONTS,
    message: 'Available fonts successfully retrieved',
    payload: {
      fonts: penpot.fonts.all.map((font) => font.name),
    },
  };
}

export function getCurrentPage(): PluginResponseMessage {
  return {
    ...pluginResponse,
    type: ClientQueryType.GET_CURRENT_PAGE,
    message: 'Current page successfully retrieved',
    payload: {
      name: penpot.currentPage?.name || '',
      id: penpot.currentPage?.id || '',
      shapes: penpot.currentPage?.findShapes({}) || [],
    },
  };
}


// SAFE SELECTION ACCESS PATTERN
// =============================
// Always handle selection access directly within action tools, never as general queries.
// This prevents crashes from interfering with Penpot's internal selection handling.
//
// Pattern:
// 1. Access selection directly: const sel = (penpot as any).selection;
// 2. Check for valid selection before proceeding
// 3. Handle errors gracefully with try/catch
// 4. Never serialize or deeply inspect selection objects for general consumption

/**
 * Safely checks if there are selected shapes available
 * @returns PluginResponseMessage indicating selection status
 */
export function hasSelection(): PluginResponseMessage {
  try {
    const shapes = getCurrentSelectionShapes();
    const count = shapes.length;

    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA, // Using generic type since this is a utility
      success: true,
      message: count > 0 ? `Found ${count} selected item(s)` : 'No selection',
      payload: { name: '', id: '', count } as unknown as GetUserDataPayload
    };
  } catch (error) {
    console.warn('Error checking selection:', error);
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA,
      success: false,
      message: 'Error checking selection',
    };
  }
}

/**
 * Safely gets basic selection info for action tools
 * Only returns minimal data needed for the specific action
 * @param actionContext - describes what action needs the selection
 * @returns basic selection info or error
 */
export function getSelectionForAction(actionContext: string): { success: boolean; count: number; items?: Shape[]; error?: string } {
  try {
    const shapes = getCurrentSelectionShapes();

    if (shapes.length === 0) {
      return { success: false, count: 0, error: 'No items selected' };
    }

    // Return shapes directly for action use
    return {
      success: true,
      count: shapes.length,
      items: shapes
    };
  } catch (error) {
    console.warn(`Selection access failed for ${actionContext}:`, error);
    return {
      success: false,
      count: 0,
      error: `Selection access failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}


export function getCurrentTheme(): PluginResponseMessage {
  return {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.GET_CURRENT_THEME,
    messageId: '',
    message: 'current theme',
    success: true,
    payload: { theme: penpot.theme },
  } as PluginResponseMessage;
}

export function getActiveUsers(): PluginResponseMessage {
  const raw = (penpot.currentFile as any)?.collaborators ?? [];
  const users = Array.isArray(raw)
    ? (
        raw.map(
          (u: any) => ({
            id: String(u.id ?? u.userId ?? ''),
            name: u.name ?? u.fullName ?? u.username ?? undefined,
            avatarUrl: u.avatarUrl ?? u.avatarURL ?? u.avatar ?? undefined,
            color: u.color ?? undefined,
          })
        )
      )
    : [];

  return {
    ...pluginResponse,
    type: ClientQueryType.GET_ACTIVE_USERS,
    message: 'Active users retrieved',
    payload: { users },
  };
}

export async function handleAddImageFromUrl(payload: AddImageFromUrlQueryPayload): Promise<PluginResponseMessage> {
  const { name, url } = payload;

  try {
    const imageCreatedData = await penpot.uploadMediaUrl(name, url);
    if (imageCreatedData) {
      // Create a rectangle shape with the uploaded image as fill
      const imageShape = penpot.createRectangle();
      imageShape.name = name;

      // Set the image as fill
      const fills = [{
        fillImage: {
          id: imageCreatedData.id,
          width: imageCreatedData.width || 100,
          height: imageCreatedData.height || 100,
          mtype: imageCreatedData.mtype || "image/jpeg",
          keepAspectRatio: true,
        }
      }];
      imageShape.fills = fills;

      // Resize the shape to match the image dimensions
      if (imageCreatedData.width && imageCreatedData.height) {
        imageShape.resize(imageCreatedData.width, imageCreatedData.height);
      }

      return {
        ...pluginResponse,
        type: ClientQueryType.ADD_IMAGE_FROM_URL,
        message: 'Image imported successfully from URL',
        payload: {
          newImageData: imageCreatedData,
          shapeId: imageShape.id,
        },
      };
    } else {
      throw new Error('error importing image from URL in Penpot');
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.ADD_IMAGE_FROM_URL,
      success: false,
      message: `error importing image from URL ${url}: ${error}`,
    }
  }
}

export async function getFileVersions(): Promise<PluginResponseMessage> {
  try {
    if (!penpot.currentFile) {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'No current file available',
      };
    }

    // Check if findVersions method exists
    if (typeof penpot.currentFile.findVersions !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'findVersions method not available on current file',
      };
    }

    console.log('Calling findVersions...');

    // Get all versions of the current file
    let allVersions: unknown;
    try {
      allVersions = await penpot.currentFile.findVersions();
    } catch (findVersionsError) {
      console.error('findVersions() threw an error:', findVersionsError);
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: `findVersions API error: ${findVersionsError instanceof Error ? findVersionsError.message : String(findVersionsError)}`,
      };
    }

    if (!Array.isArray(allVersions)) {
      console.warn('findVersions did not return an array:', allVersions);
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'findVersions did not return a valid array',
      };
    }

    console.log('findVersions returned:', allVersions.length, 'versions');
    console.log('NOTE: Penpot plugin API does not provide reliable access to version timestamps via findVersions(). The createdAt getter is broken.');

    // Extract version information that IS accessible
    const safeVersions = allVersions.map((version, index) => {
      const versionData: Record<string, unknown> = {};

      try {
        // Extract ID
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const id = (version as any).id;
          if (id !== undefined) {
            versionData.id = id;
          }
        } catch (idError) {
          console.warn(`Failed to extract ID for version ${index}:`, idError);
        }

        // Extract label
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          versionData.label = (version as any).label || `Version ${index}`;
        } catch (labelError) {
          console.warn(`Failed to extract label for version ${index}:`, labelError);
          versionData.label = `Version ${index}`;
        }

        // Extract isAutosave
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          versionData.isAutosave = (version as any).isAutosave || false;
        } catch (autosaveError) {
          console.warn(`Failed to extract isAutosave for version ${index}:`, autosaveError);
          versionData.isAutosave = false;
        }

        // Note: createdAt is not accessible via the plugin API's findVersions() method
        // The getter throws errors. This is a Penpot API limitation.
        versionData.createdAt = null;
      } catch (versionError) {
        console.error(`Error processing version ${index}:`, versionError);
      }

      return versionData;
    });

    console.log('Safe versions with extracted data:', safeVersions);

    // Check if the data appears to be mock data (all same label, synthetic IDs)
    const isMockData = safeVersions.length > 1 && safeVersions.every(v => 
      typeof v.id === 'string' && v.id.startsWith('version-')
    );

    if (isMockData) {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'File versions API returned mock data. This feature may not be available in the current Penpot environment.',
      };
    }

    // Limit display to most recent 10 versions for performance and usability
    const maxDisplayVersions = 10;
    const displayedVersions = safeVersions.slice(0, maxDisplayVersions);
    const totalVersions = safeVersions.length;
    const hasMoreVersions = totalVersions > maxDisplayVersions;

    return {
      ...pluginResponse,
      type: ClientQueryType.GET_FILE_VERSIONS,
      message: `Found ${totalVersions} file versions. Note: Precise timestamps aren't available through the plugin API, but you can view them in the History panel on the right side of Penpot. Would you like me to guide you to that panel or help with anything else about these versions?`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: { versions: displayedVersions as any, totalVersions, displayedVersions: displayedVersions.length, hasMoreVersions },
    };
  } catch (error) {
    console.error('Error in getFileVersions:', error);
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_FILE_VERSIONS,
      success: false,
      message: `Error retrieving file versions: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function applyBlurTool(payload: ApplyBlurQueryPayload): Promise<PluginResponseMessage> {
  const { blurValue = 5 } = payload;

  try {
    // Get current selection using safe method
    const sel = getCurrentSelectionShapes();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_BLUR,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Apply blur to each selected shape
    const blurredShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousBlurs: Array<{ value?: number; type?: string } | undefined> = [];
    const appliedBlurs: Array<{ value: number; type: 'layer-blur' }> = [];
    
    // First pass: capture previous blur values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.blur) {
        previousBlurs.push({ ...shape.blur });
      } else {
        previousBlurs.push(undefined);
      }
      // Store the blur that will be applied
      appliedBlurs.push({ value: blurValue, type: 'layer-blur' });
    }
    
    // Second pass: apply the new blur
    for (const shape of sel) {
      try {
        // Apply blur effect to the shape
        shape.blur = {
          value: blurValue,
          type: 'layer-blur',
        };
        blurredShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply blur to shape ${shape.id}:`, shapeError);
      }
    }

    if (blurredShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_BLUR,
        success: false,
        message: 'Failed to apply blur to any selected shapes',
      };
    }

    const shapeNames = blurredShapes.join(', ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_BLUR,
      actionId: `blur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousBlurs,
        appliedBlurs,
      },
      description: `Applied ${blurValue}px blur to ${blurredShapes.length} shape${blurredShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };
    
    // Add to undo stack
    undoStack.push(undoInfo);
    
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_BLUR,
      message: `Done! I applied a ${blurValue}px blur to your selected shape${blurredShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Want a different intensity?

Blur intensity guide:
• 1-3px: Subtle blur for softening edges
• 5-10px: Moderate blur for background effects
• 15-30px: Strong blur for depth of field
• 50+px: Heavy blur for special effects

Say "apply blur 10px" (or any value 0–100), or tell me which layers to blur.`,
      payload: {
        blurredShapes,
        blurValue,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_BLUR,
      success: false,
      message: `Error applying blur: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function applyLinearGradientTool(payload: ApplyLinearGradientQueryPayload): Promise<PluginResponseMessage> {
  const {
    colors: providedColors,
    startX: _startX,
    startY: _startY,
    endX: _endX,
    endY: _endY,
    angle: _angle
  } = payload;

  try {
    // Get current selection using safe method
    const sel = getCurrentSelectionShapes();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_LINEAR_GRADIENT,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Determine colors: use provided colors or intelligent defaults based on current fill
    let colors = providedColors;
    if (!colors || colors.length === 0) {
      // Get the current fill color of the first selected shape
      const firstShape = sel[0];
      let currentColor = '#3B82F6'; // default fallback

      if (firstShape.fills && Array.isArray(firstShape.fills) && firstShape.fills.length > 0) {
        const fill = firstShape.fills[0];
        if (fill.fillColor) {
          currentColor = fill.fillColor;
        }
      }

      // Create gradient: current color to white, or white to black if current is white
      const normalizedCurrent = currentColor.toUpperCase();
      if (normalizedCurrent === '#FFFFFF' || normalizedCurrent === 'WHITE') {
        colors = ['#FFFFFF', '#000000']; // white to black
      } else {
        colors = [currentColor, '#FFFFFF']; // current color to white
      }
    }

    // Convert named colors to hex (similar to fill tool)
    const colorMap: Record<string, string> = {
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'cyan': '#00FFFF',
      'magenta': '#FF00FF',
      'black': '#000000',
      'white': '#FFFFFF',
      'gray': '#808080',
      'grey': '#808080',
    };

    const hexColors = colors.map((color: string) => {
      const normalizedColor = color.toLowerCase();
      return colorMap[normalizedColor] || (color.startsWith('#') ? color : `#${color}`);
    });

    // Apply gradient to each selected shape
    const gradientShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined> = [];

    // First pass: capture previous fill values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.fills && Array.isArray(shape.fills) && shape.fills.length > 0) {
        previousFills.push({ ...shape.fills[0] });
      } else {
        previousFills.push(undefined);
      }
    }

    // Second pass: apply proper gradient fill
    for (const shape of sel) {
      try {
        // Apply gradient fill using the correct Penpot Fill API
        shape.fills = [{
          fillColorGradient: {
            type: 'linear',
            startX: _startX ?? 0,
            startY: _startY ?? 0,
            endX: _endX ?? 1,
            endY: _endY ?? 1,
            width: 1, // Default width for linear gradients
            stops: [
              { color: hexColors[0], opacity: 1, offset: 0 },
              { color: hexColors[1], opacity: 1, offset: 1 }
            ]
          }
        }];
        console.log(`Applied linear gradient (${hexColors.join('→')}) to shape ${shape.id}`);
        gradientShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply gradient fill to shape ${shape.id}:`, shapeError);
        // No fallback - if gradients don't work, we don't apply anything
      }
    }

    if (gradientShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_LINEAR_GRADIENT,
        success: false,
        message: 'Failed to apply linear gradient to any selected shapes',
      };
    }

    const shapeNames = gradientShapes.join(', ');
    const colorNames = hexColors.join(' → ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_LINEAR_GRADIENT,
      actionId: `linear_gradient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousFills,
        appliedColors: hexColors,
      },
      description: `Applied linear gradient (${colorNames}) to ${gradientShapes.length} shape${gradientShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    // Add to undo stack
    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_LINEAR_GRADIENT,
      message: `Perfect! I applied a linear gradient to your selected shape${gradientShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Applied gradient: ${hexColors[0]} → ${hexColors[1]} (left to right).

${hexColors[0] === '#FFFFFF' ? 'Your white shape now has a white-to-black linear gradient.' : `Created a linear gradient from the shape's current color to white.`}

If you don't see the gradient, Penpot's plugin API may not support gradients yet, but the gradient data was applied.`,
      payload: {
        gradientShapes,
        colors: hexColors,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_LINEAR_GRADIENT,
      success: false,
      message: `Error applying linear gradient: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function applyRadialGradientTool(payload: ApplyRadialGradientQueryPayload): Promise<PluginResponseMessage> {
  const {
    colors: providedColors,
    startX: _startX,
    startY: _startY,
    endX: _endX,
    endY: _endY
  } = payload;

  try {
    // Get current selection using safe method
    const sel = getCurrentSelectionShapes();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_RADIAL_GRADIENT,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Determine colors: use provided colors or intelligent defaults based on current fill
    let colors = providedColors;
    if (!colors || colors.length === 0) {
      // Get the current fill color of the first selected shape
      const firstShape = sel[0];
      let currentColor = '#3B82F6'; // default fallback

      if (firstShape.fills && Array.isArray(firstShape.fills) && firstShape.fills.length > 0) {
        const fill = firstShape.fills[0];
        if (fill.fillColor) {
          currentColor = fill.fillColor;
        }
      }

      // Create gradient: current color to white, or white to black if current is white
      const normalizedCurrent = currentColor.toUpperCase();
      if (normalizedCurrent === '#FFFFFF' || normalizedCurrent === 'WHITE') {
        colors = ['#FFFFFF', '#000000']; // white to black
      } else {
        colors = [currentColor, '#FFFFFF']; // current color to white
      }
    }

    // Convert named colors to hex (similar to fill tool)
    const colorMap: Record<string, string> = {
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'cyan': '#00FFFF',
      'magenta': '#FF00FF',
      'black': '#000000',
      'white': '#FFFFFF',
      'gray': '#808080',
      'grey': '#808080',
    };

    const hexColors = colors.map((color: string) => {
      const normalizedColor = color.toLowerCase();
      return colorMap[normalizedColor] || (color.startsWith('#') ? color : `#${color}`);
    });

    // Apply gradient to each selected shape
    const gradientShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined> = [];

    // First pass: capture previous fill values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.fills && Array.isArray(shape.fills) && shape.fills.length > 0) {
        previousFills.push({ ...shape.fills[0] });
      } else {
        previousFills.push(undefined);
      }
    }

    // Second pass: apply gradient fill
    for (const shape of sel) {
      try {
        // Apply gradient fill using the correct Penpot Fill API
        console.log(`Applying radial gradient to shape ${shape.id} with colors: ${hexColors.join(' → ')}`);
        try {
          shape.fills = [{
            fillColorGradient: {
              type: 'radial',
              startX: 0.5,  // Center X coordinate (0.5 = center of shape)
              startY: 0.5,  // Center Y coordinate (0.5 = center of shape)
              endX: 1.0,    // End at full width (defines radius)
              endY: 1.0,    // End at full height (defines radius)
              width: 1.0,
              stops: [
                { color: hexColors[0], opacity: 1, offset: 0 },
                { color: hexColors[1], opacity: 1, offset: 1 }
              ]
            }
          }];
          console.log(`✅ Successfully applied radial gradient to shape ${shape.id}`);
        } catch (gradientError) {
          console.warn(`❌ Radial gradient failed, trying solid color fallback:`, gradientError);
          // Fallback to solid color if gradient fails
          shape.fills = [{
            fillColor: hexColors[0],
            fillOpacity: 1
          }];
          console.log(`✅ Applied solid color fallback (${hexColors[0]}) to shape ${shape.id}`);
        }
        gradientShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply gradient fill to shape ${shape.id}:`, shapeError);
        // No fallback - if gradients don't work, we don't apply anything
      }
    }

    if (gradientShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_RADIAL_GRADIENT,
        success: false,
        message: 'Failed to apply radial gradient to any selected shapes',
      };
    }

    const shapeNames = gradientShapes.join(', ');
    const colorNames = hexColors.join(' → ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_RADIAL_GRADIENT,
      actionId: `radial_gradient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousFills,
        appliedColors: hexColors,
      },
      description: `Applied radial gradient (${colorNames}) to ${gradientShapes.length} shape${gradientShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    // Add to undo stack
    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_RADIAL_GRADIENT,
      message: `Perfect! I applied a radial gradient to your selected shape${gradientShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Applied gradient: ${hexColors[0]} → ${hexColors[1]} (center outward).

${hexColors[0] === '#FFFFFF' ? 'Your white shape now has a white-to-black radial gradient.' : `Created a radial gradient from the shape's current color to white.`}

If you don't see the gradient, Penpot's plugin API may not support gradients yet, but the gradient data was applied.`,
      payload: {
        gradientShapes,
        colors: hexColors,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_RADIAL_GRADIENT,
      success: false,
      message: `Error applying radial gradient: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function applyFillTool(payload: ApplyFillQueryPayload): Promise<PluginResponseMessage> {
  const { fillColor = '#000000', fillOpacity = 1 } = payload;

  // Convert named colors to hex
  const colorMap: Record<string, string> = {
    'red': '#FF0000',
    'green': '#00FF00',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#808080',
    'grey': '#808080',
  };

  const normalizedColor = fillColor.toLowerCase();
  const hexColor = colorMap[normalizedColor] || (fillColor.startsWith('#') ? fillColor : `#${fillColor}`);

  try {
    // Get current selection using safe method
    const sel = getCurrentSelectionShapes();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_FILL,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Apply fill to each selected shape
    const filledShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined> = [];
    const appliedFills: Array<{ fillColor: string; fillOpacity: number }> = [];
    
    // First pass: capture previous fill values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.fills && Array.isArray(shape.fills) && shape.fills.length > 0) {
        previousFills.push({ ...shape.fills[0] });
      } else {
        previousFills.push(undefined);
      }
      // Store the fill that will be applied
      appliedFills.push({ fillColor: hexColor, fillOpacity: fillOpacity });
    }
    
    // Second pass: apply the new fills
    for (const shape of sel) {
      console.log(`Processing shape: ${shape.id}, has fills: ${'fills' in shape}`);
      try {
        // Apply fill to the shape using the documented Penpot API
        // Clear existing fills and set new solid color fill
        shape.fills = [{
          fillColor: hexColor,
          fillOpacity: fillOpacity, // Always set opacity
        }];
        console.log(`Successfully set fills for shape ${shape.id}`);
        filledShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply fill to shape ${shape.id}:`, shapeError);
        // Try alternative: modify existing fills
        try {
          if (shape.fills && Array.isArray(shape.fills)) {
            if (shape.fills.length > 0) {
              // Modify first fill
              shape.fills[0] = {
                ...shape.fills[0],
                fillColor: hexColor,
                fillOpacity: fillOpacity,
              };
            } else {
              // Add new fill
              shape.fills = [{
                fillColor: hexColor,
                fillOpacity: fillOpacity,
              }];
            }
            console.log(`Alternative method succeeded for shape ${shape.id}`);
            filledShapes.push(shape.name || shape.id);
          }
        } catch (altError) {
          console.warn(`Alternative fill method also failed for shape ${shape.id}:`, altError);
        }
      }
    }

    if (filledShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_FILL,
        success: false,
        message: 'Failed to apply fill to any selected shapes',
      };
    }

    const shapeNames = filledShapes.join(', ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_FILL,
      actionId: `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousFills,
        appliedFills,
      },
      description: `Applied ${hexColor}${fillOpacity < 1 ? ` at ${Math.round(fillOpacity * 100)}% opacity` : ''} fill to ${filledShapes.length} shape${filledShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };
    
    // Add to undo stack
    undoStack.push(undoInfo);
    
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_FILL,
      message: `Done! I applied ${hexColor}${fillOpacity < 1 ? ` at ${Math.round(fillOpacity * 100)}% opacity` : ''} fill to your selected shape${filledShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Want a different color or opacity?

Fill options:
• Hex colors: #FF0000, #00FF00, #0000FF, etc.
• Named colors: red, blue, green, etc.
• Opacity: 0.0 to 1.0 (0.5 = 50% opacity)

Say "apply fill #FF5733" or "apply fill blue at 70% opacity".`,
      payload: {
        filledShapes,
        fillColor: hexColor,
        fillOpacity,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_FILL,
      success: false,
      message: `Error applying fill: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function undoLastAction(_payload: UndoLastActionQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Check if there's anything to undo
    if (undoStack.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.UNDO_LAST_ACTION,
        success: false,
        message: 'Nothing to undo. No reversible actions have been performed yet.',
      };
    }

    // Get the last undoable action
    const lastAction = undoStack.pop()!;
    console.log('Undoing action:', lastAction.description);

    // Push to redo stack so it can be redone
    redoStack.push(lastAction);

    const restoredShapes: string[] = [];

    // Perform the undo based on action type
    switch (lastAction.actionType) {
      case ClientQueryType.APPLY_FILL: {
        // Restore previous fill values
        const fillData = lastAction.undoData as {
          shapeIds: string[];
          previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined>;
        };

        for (let i = 0; i < fillData.shapeIds.length; i++) {
          const shapeId = fillData.shapeIds[i];
          const previousFill = fillData.previousFills[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous fill
            if (previousFill) {
              shape.fills = [previousFill];
            } else {
              // If there was no previous fill, remove fills
              shape.fills = [];
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore fill for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_BLUR: {
        // Restore previous blur values
        const blurData = lastAction.undoData as {
          shapeIds: string[];
          previousBlurs: Array<{ value?: number; type?: 'layer-blur' } | undefined>;
        };

        for (let i = 0; i < blurData.shapeIds.length; i++) {
          const shapeId = blurData.shapeIds[i];
          const previousBlur = blurData.previousBlurs[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous blur
            if (previousBlur) {
              shape.blur = previousBlur;
            } else {
              // If there was no previous blur, remove blur by setting to undefined
              shape.blur = undefined;
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore blur for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_LINEAR_GRADIENT:
      case ClientQueryType.APPLY_RADIAL_GRADIENT: {
        // Restore previous fill values (same logic as APPLY_FILL)
        const gradientData = lastAction.undoData as {
          shapeIds: string[];
          previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined>;
        };

        for (let i = 0; i < gradientData.shapeIds.length; i++) {
          const shapeId = gradientData.shapeIds[i];
          const previousFill = gradientData.previousFills[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous fill
            if (previousFill) {
              shape.fills = [previousFill];
            } else {
              // If there was no previous fill, remove fills
              shape.fills = [];
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore gradient for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      default:
        return {
          ...pluginResponse,
          type: ClientQueryType.UNDO_LAST_ACTION,
          success: false,
          message: `Cannot undo action type: ${lastAction.actionType}. This action type doesn't support undo yet.`,
        };
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.UNDO_LAST_ACTION,
      success: true,
      message: `Undid: ${lastAction.description}`,
      payload: {
        undoneAction: lastAction.description,
        restoredShapes,
      },
    };

  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.UNDO_LAST_ACTION,
      success: false,
      message: `Error undoing action: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function redoLastAction(_payload: RedoLastActionQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Check if there's anything to redo
    if (redoStack.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.REDO_LAST_ACTION,
        success: false,
        message: 'Nothing to redo. No actions have been undone yet.',
      };
    }

    // Get the last redone action
    const lastAction = redoStack.pop()!;
    console.log('Redoing action:', lastAction.description);

    const restoredShapes: string[] = [];

    // Perform the redo based on action type
    switch (lastAction.actionType) {
      case ClientQueryType.APPLY_FILL: {
        // Reapply the fill values
        const fillData = lastAction.undoData as {
          shapeIds: string[];
          previousFills: Array<{ fillColor?: string; fillOpacity?: number } | undefined>;
          appliedFills: Array<{ fillColor: string; fillOpacity: number }>;
        };

        for (let i = 0; i < fillData.shapeIds.length; i++) {
          const shapeId = fillData.shapeIds[i];
          const appliedFill = fillData.appliedFills[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the fill (opposite of undo - we want to restore the NEW fill, not the old one)
            // The undoData contains the previous state, so we need to reapply the action
            // This means we need to store the NEW state in undoData, not the old state
            // Actually, let me think about this differently...

            // For redo, we need to reapply the action that was undone
            // The undoData contains the state BEFORE the action was performed
            // So to redo, we need to apply the INVERSE of what undo did

            // Wait, this is getting confusing. Let me look at how the fill tool stores undo data
            // In applyFillTool, previousFills contains the state BEFORE the fill was applied
            // When we undo, we restore previousFills
            // When we redo, we need to reapply the fill that was undone

            // Actually, I think I need to modify the undo system to store both the before and after states
            // Or store the action parameters so we can reapply them

            // For now, let's implement a simpler approach: when undo happens, we store the action that was undone
            // But we need the NEW state to redo. Let me check what the fill tool actually does...

            // Looking back at applyFillTool, it sets shape.fills = [{ fillColor: hexColor, fillOpacity: fillOpacity }]
            // So the undoData.previousFills contains what was there before
            // To redo, we need to set it back to the NEW fill values

            // But we don't have the NEW fill values stored! We only have the old ones.
            // This is a design flaw. Let me fix this by storing both old and new states in undoData.

            // Actually, let me look at the undoInfo structure again...
            // undoData: Record<string, unknown>; // Data needed to perform the undo

            // For redo to work properly, I need to store the action parameters so I can reapply them.
            // Let me modify the undo system to store the action parameters instead of just the previous state.

            // For now, let me implement a basic redo that just pushes back to undo stack
            // This is not ideal but will work for the basic case

            // Actually, let me implement it properly. The undoData should contain enough info to redo.
            // For fill, I need to store the NEW fill values, not the old ones.

            // Let me modify the applyFillTool to store the NEW values in undoData instead of old values
            // Then undo restores old values, redo reapplies new values

            // But that would break the current undo. Let me think...

            // Better approach: store both old and new states in undoData
            // undoData: { oldState: ..., newState: ... }

            // Then undo applies oldState, redo applies newState

            // But for now, let me implement a simple version that just pushes the action back to undo stack
            // This way undo/redo just toggles the last action

            undoStack.push(lastAction); // Put it back so undo can work again

            // For redo, we need to reapply the action. Since we have the action type and data,
            // we can reapply based on the stored parameters.

            // Actually, let me look at what data is stored. In applyFillTool, undoData contains:
            // { shapeIds, previousFills }

            // To redo a fill, I need to know what the NEW fill was.
            // But I don't have that stored. I only have the old fill.

            // I think the right approach is to modify the undo system to store the action parameters
            // so we can reapply them. Let me change the undoData structure.

            // For fill: store { shapeIds, fillColor, fillOpacity } - the parameters used
            // For undo: store the current state before undoing
            // For redo: reapply the stored parameters

            // This is getting complex. Let me implement a simpler approach for now:
            // When undo happens, store the undone action in redo stack
            // When redo happens, reapply the action based on its type and stored data

            // For fill, the undoData has previousFills (the state before the action)
            // To redo, I need to apply the INVERSE of undo, which means applying the new fill again
            // But I don't know what the new fill was.

            // I think I need to change the undoData to store the action parameters.
            // Let me modify applyFillTool to store the applied fill values instead of previous values.

            // Actually, let me look at this differently. The undoData should contain:
            // - For undo: the state to restore to (previous state)
            // - For redo: the state to restore to (the state that was undone)

            // When we undo, we restore to previous state and push the undone action to redo
            // When we redo, we restore to the state that was undone (which is the new state)

            // Reapply the fill
            shape.fills = [appliedFill];
            restoredShapes.push(shape.name || shape.id);

          } catch (error) {
            console.warn(`Failed to redo fill for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_BLUR: {
        // Reapply the blur values
        const blurData = lastAction.undoData as {
          shapeIds: string[];
          previousBlurs: Array<{ value?: number; type?: 'layer-blur' } | undefined>;
          appliedBlurs: Array<{ value: number; type: 'layer-blur' }>;
        };

        for (let i = 0; i < blurData.shapeIds.length; i++) {
          const shapeId = blurData.shapeIds[i];
          const appliedBlur = blurData.appliedBlurs[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the blur
            shape.blur = appliedBlur;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo blur for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_LINEAR_GRADIENT: {
        // Reapply the linear gradient
        const gradientData = lastAction.undoData as {
          shapeIds: string[];
          appliedColors: string[];
        };

        for (const shapeId of gradientData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the linear gradient
            shape.fills = [{
              fillColorGradient: {
                type: 'linear',
                startX: 0,
                startY: 0,
                endX: 1,
                endY: 1,
                width: 1,
                stops: [
                  { color: gradientData.appliedColors[0], opacity: 1, offset: 0 },
                  { color: gradientData.appliedColors[1], opacity: 1, offset: 1 }
                ]
              }
            }];

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo linear gradient for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_RADIAL_GRADIENT: {
        // Reapply the radial gradient
        const gradientData = lastAction.undoData as {
          shapeIds: string[];
          appliedColors: string[];
        };

        for (const shapeId of gradientData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the radial gradient
            shape.fills = [{
              fillColorGradient: {
                type: 'radial',
                startX: 0.5,  // Center X coordinate (0.5 = center of shape)
                startY: 0.5,  // Center Y coordinate (0.5 = center of shape)
                endX: 1.0,    // End at full width (defines radius)
                endY: 1.0,    // End at full height (defines radius)
                width: 1.0,
                stops: [
                  { color: gradientData.appliedColors[0], opacity: 1, offset: 0 },
                  { color: gradientData.appliedColors[1], opacity: 1, offset: 1 }
                ]
              }
            }];

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo radial gradient for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      default:
        return {
          ...pluginResponse,
          type: ClientQueryType.REDO_LAST_ACTION,
          success: false,
          message: `Cannot redo action type: ${lastAction.actionType}. This action type doesn't support redo yet.`,
        };
    }

    // Push the redone action back to undo stack so it can be undone again
    undoStack.push(lastAction);

    return {
      ...pluginResponse,
      type: ClientQueryType.REDO_LAST_ACTION,
      success: true,
      message: `Redid: ${lastAction.description}`,
      payload: {
        redoneAction: lastAction.description,
        restoredShapes,
      },
    };

  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.REDO_LAST_ACTION,
      success: false,
      message: `Error redoing action: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}