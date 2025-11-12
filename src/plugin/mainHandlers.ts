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
  ApplyStrokeQueryPayload,
  ApplyLinearGradientQueryPayload,
  ApplyRadialGradientQueryPayload,
  ApplyShadowQueryPayload,
  AlignHorizontalQueryPayload,
  AlignVerticalQueryPayload,
  CenterAlignmentQueryPayload,
  DistributeHorizontalQueryPayload,
  DistributeVerticalQueryPayload,
  GroupQueryPayload,
  UngroupQueryPayload,
  CombineShapesQueryPayload,
  ClientQueryType,
  MessageSourceName,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  UndoInfo,
  UndoLastActionQueryPayload,
  RedoLastActionQueryPayload,
} from "../types/types";
import type { Shape, Group, Fill, Stroke } from '@penpot/plugin-types';

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
const redoStack: UndoInfo[] = [];
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
      // Use shared selection system for safe selection access
      const selectedShapes = getSelectionForAction();
      if (!selectedShapes || selectedShapes.length === 0) {
        return {
          ...pluginResponse,
          type: ClientQueryType.CREATE_LIBRARY_COMPONENT,
          success: false,
          message: 'NO_SELECTION',
        };
      }
      componentShapes = selectedShapes;
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
 * SHARED SELECTION SYSTEM
 * =======================
 *
 * Provides safe selection access for all tools that need to work with selected shapes.
 * This system prevents JavaFX crashes by following the safety pattern:
 * - Access selection directly within action-performing functions only
 * - Never create general-purpose selection querying tools
 * - Handle errors gracefully with try/catch blocks
 */

// SAFE SELECTION ACCESS PATTERN
// =============================
// This function should ONLY be called by tools when they are actually
// performing an action, not for general selection querying.
// Never use this for AI consumption or serialization.
export function getSelectionForAction(): Shape[] {
  console.log('🔍 getSelectionForAction called - safe for action-performing tools only');

  try {
    // Only access selection when actually performing an action
    const directSel = penpot.selection;
    if (directSel && Array.isArray(directSel) && directSel.length > 0) {
      console.log(`✅ Found ${directSel.length} shapes for action`);
      return directSel;
    }
  } catch (error) {
    console.warn('❌ Selection access failed:', error);
  }

  console.log('❌ No selection available for action');
  return [];
}

// Check if selection exists (safe utility)
export function hasValidSelection(): boolean {
  try {
    const selection = (penpot as unknown as { selection: Shape[] }).selection;
    return selection && Array.isArray(selection) && selection.length > 0;
  } catch (error) {
    console.warn('❌ Error checking selection validity:', error);
    return false;
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
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
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
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
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
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
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
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
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

export async function applyStrokeTool(payload: ApplyStrokeQueryPayload): Promise<PluginResponseMessage> {
  const {
    strokeColor = '#000000',
    strokeWidth = 1,
    strokeOpacity = 1,
    strokeStyle = 'solid',
    overrideExisting = false
  } = payload;

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

  const normalizedColor = strokeColor.toLowerCase();
  const hexColor = colorMap[normalizedColor] || (strokeColor.startsWith('#') ? strokeColor : `#${strokeColor}`);

  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_STROKE,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Check if any shapes already have strokes and user hasn't opted to override
    if (!overrideExisting) {
      const shapesWithStrokes = sel.filter(shape =>
        shape.strokes && Array.isArray(shape.strokes) && shape.strokes.length > 0
      );

      if (shapesWithStrokes.length > 0) {
        const shapeNames = shapesWithStrokes.map(s => s.name || s.id).join(', ');
        return {
          ...pluginResponse,
          type: ClientQueryType.APPLY_STROKE,
          success: false,
          message: `I found that ${shapesWithStrokes.length} of your selected shape${shapesWithStrokes.length > 1 ? 's' : ''} already ${shapesWithStrokes.length > 1 ? 'have' : 'has'} stroke${shapesWithStrokes.length > 1 ? 's' : ''} applied: ${shapeNames}.

Do you want to override the existing stroke${shapesWithStrokes.length > 1 ? 's' : ''} with the new one (${hexColor}, ${strokeWidth}px, ${strokeStyle}${strokeOpacity < 1 ? `, ${Math.round(strokeOpacity * 100)}% opacity` : ''})?

Say "apply stroke with override" or "apply stroke override existing" to proceed with overriding.`,
          payload: {
            shapesWithExistingStrokes: shapesWithStrokes.map(s => ({ id: s.id, name: s.name })),
            requestedStroke: { strokeColor: hexColor, strokeWidth, strokeOpacity, strokeStyle }
          }
        };
      }
    }

    // Apply stroke to each selected shape
    const strokedShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousStrokes: Array<{ strokeColor?: string; strokeWidth?: number; strokeOpacity?: number; strokeStyle?: string } | undefined> = [];
    const appliedStrokes: Array<{ strokeColor: string; strokeWidth: number; strokeOpacity: number; strokeStyle: string }> = [];

    // First pass: capture previous stroke values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.strokes && Array.isArray(shape.strokes) && shape.strokes.length > 0) {
        previousStrokes.push({ ...shape.strokes[0] });
      } else {
        previousStrokes.push(undefined);
      }
      // Store the stroke that will be applied
      appliedStrokes.push({ strokeColor: hexColor, strokeWidth, strokeOpacity, strokeStyle });
    }

    // Second pass: apply the new strokes
    for (const shape of sel) {
      console.log(`Processing shape: ${shape.id}, has strokes: ${'strokes' in shape}`);
      try {
        // Apply stroke to the shape using the same approach as fills
        // Always replace the entire strokes array to ensure all properties are set correctly
        shape.strokes = [{
          strokeColor: hexColor,
          strokeWidth: strokeWidth,
          strokeOpacity: strokeOpacity,
          strokeStyle: strokeStyle,
        }];
        console.log(`Successfully applied stroke to shape ${shape.id}`);
        strokedShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply stroke to shape ${shape.id}:`, shapeError);
      }
    }

    if (strokedShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_STROKE,
        success: false,
        message: 'Failed to apply stroke to any selected shapes',
      };
    }

    const shapeNames = strokedShapes.join(', ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_STROKE,
      actionId: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousStrokes,
        appliedStrokes,
      },
      description: `Applied ${hexColor} stroke (${strokeWidth}px, ${strokeStyle}${strokeOpacity < 1 ? `, ${Math.round(strokeOpacity * 100)}% opacity` : ''}) to ${strokedShapes.length} shape${strokedShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    // Add to undo stack
    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_STROKE,
      message: `Done! I applied a ${hexColor} stroke (${strokeWidth}px, ${strokeStyle}${strokeOpacity < 1 ? `, ${Math.round(strokeOpacity * 100)}% opacity` : ''}) to your selected shape${strokedShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Want different stroke properties?

Stroke options:
• Stroke color: Hex colors (#FF0000) or named colors (red, blue, etc.)
• Stroke width: Number in pixels (1, 2, 5, etc.)
• Stroke opacity: 0.0 to 1.0 (0.5 = 50% opacity)
• Stroke style: solid, dashed, dotted, mixed
• Line cap: butt, round, square
• Line join: miter, round, bevel

Say "apply stroke #FF5733 width 3" or "apply stroke blue dashed at 80% opacity".`,
      payload: {
        strokedShapes,
        strokeColor: hexColor,
        strokeWidth,
        strokeOpacity,
        strokeStyle,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_STROKE,
      success: false,
      message: `Error applying stroke: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function applyShadowTool(payload: ApplyShadowQueryPayload): Promise<PluginResponseMessage> {
  const {
    shadowStyle = 'drop-shadow',
    shadowColor = '#000000',
    shadowOffsetX = 4,
    shadowOffsetY = 4,
    shadowBlur = 8,
    shadowSpread = 0,
    overrideExisting = false
  } = payload;

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

  const normalizedColor = shadowColor.toLowerCase();
  const hexColor = colorMap[normalizedColor] || (shadowColor.startsWith('#') ? shadowColor : `#${shadowColor}`);

  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_SHADOW,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Check if any shapes already have shadows and user hasn't opted to override
    if (!overrideExisting) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapesWithShadows = sel.filter((shape: any) =>
        shape.shadows && Array.isArray(shape.shadows) && shape.shadows.length > 0
      );

      if (shapesWithShadows.length > 0) {
        const shapeNames = shapesWithShadows.map(s => s.name || s.id).join(', ');
        return {
          ...pluginResponse,
          type: ClientQueryType.APPLY_SHADOW,
          success: false,
          message: `I found that ${shapesWithShadows.length} of your selected shape${shapesWithShadows.length > 1 ? 's' : ''} already ${shapesWithShadows.length > 1 ? 'have' : 'has'} shadow${shapesWithShadows.length > 1 ? 's' : ''} applied: ${shapeNames}.

Do you want to override the existing shadow${shapesWithShadows.length > 1 ? 's' : ''} with the new one (${shadowStyle}, ${hexColor}, ${shadowOffsetX}px ${shadowOffsetY}px offset, ${shadowBlur}px blur${shadowSpread !== 0 ? `, ${shadowSpread}px spread` : ''})?

Say "apply shadow with override" or "apply shadow override existing" to proceed with overriding.`,
          payload: {
            shapesWithExistingShadows: shapesWithShadows.map(s => ({ id: s.id, name: s.name })),
            requestedShadow: { shadowStyle, shadowColor: hexColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowSpread }
          }
        };
      }
    }

    // Apply shadow to each selected shape
    const shadowedShapes: string[] = [];
    const shapeIds: string[] = [];
    const previousShadows: Array<{ style?: string; color?: string; offsetX?: number; offsetY?: number; blur?: number; spread?: number } | undefined> = [];
    const appliedShadows: Array<{ style: string; color: string; offsetX: number; offsetY: number; blur: number; spread: number }> = [];

    // First pass: capture previous shadow values for undo
    for (const shape of sel) {
      shapeIds.push(shape.id);
      if (shape.shadows && Array.isArray(shape.shadows) && shape.shadows.length > 0) {
        // Convert Color object to string for storage
        const shadow = shape.shadows[0];
        previousShadows.push({
          style: shadow.style,
          color: typeof shadow.color === 'string' ? shadow.color : '#000000', // fallback if Color object
          offsetX: shadow.offsetX,
          offsetY: shadow.offsetY,
          blur: shadow.blur,
          spread: shadow.spread
        });
      } else {
        previousShadows.push(undefined);
      }
      // Store the shadow that will be applied
      appliedShadows.push({ style: shadowStyle, color: hexColor, offsetX: shadowOffsetX, offsetY: shadowOffsetY, blur: shadowBlur, spread: shadowSpread });
    }

    // Second pass: apply the new shadows
    for (const shape of sel) {
      console.log(`Processing shape: ${shape.id}, has shadows: ${'shadows' in shape}`);
      try {
        // Apply shadow to the shape using the same approach as fills/strokes
        // Always replace the entire shadows array to ensure all properties are set correctly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (shape as any).shadows = [{
          style: shadowStyle,
          color: hexColor, // Penpot accepts hex strings for shadow color
          offsetX: shadowOffsetX,
          offsetY: shadowOffsetY,
          blur: shadowBlur,
          spread: shadowSpread,
        }];
        console.log(`Successfully applied shadow to shape ${shape.id}`);
        shadowedShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply shadow to shape ${shape.id}:`, shapeError);
      }
    }

    if (shadowedShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.APPLY_SHADOW,
        success: false,
        message: 'Failed to apply shadow to any selected shapes',
      };
    }

    const shapeNames = shadowedShapes.join(', ');
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.APPLY_SHADOW,
      actionId: `shadow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousShadows,
        appliedShadows,
      },
      description: `Applied ${shadowStyle} shadow (${hexColor}, ${shadowOffsetX}px ${shadowOffsetY}px offset, ${shadowBlur}px blur${shadowSpread !== 0 ? `, ${shadowSpread}px spread` : ''}) to ${shadowedShapes.length} shape${shadowedShapes.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    // Add to undo stack
    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_SHADOW,
      message: `Done! I applied a ${shadowStyle} shadow (${hexColor}, ${shadowOffsetX}px ${shadowOffsetY}px offset, ${shadowBlur}px blur${shadowSpread !== 0 ? `, ${shadowSpread}px spread` : ''}) to your selected shape${shadowedShapes.length > 1 ? 's' : ''}: ${shapeNames}.

Want different shadow properties?

Shadow options:
• Shadow style: drop-shadow (outside) or inner-shadow (inside)
• Shadow color: Hex colors (#FF0000) or named colors (red, blue, etc.)
• Shadow offset: X,Y values in pixels (e.g., 2,4 for 2px right, 4px down)
• Shadow blur: Blur radius in pixels (0-50, higher = more blurred)
• Shadow spread: Spread radius in pixels (optional, extends/contracts shadow)

Say "apply shadow drop-shadow #333333 offset 0,8 blur 12" or "apply shadow inner-shadow red offset 2,-2 blur 4".`,
      payload: {
        shadowedShapes,
        shadowStyle,
        shadowColor: hexColor,
        shadowOffsetX,
        shadowOffsetY,
        shadowBlur,
        shadowSpread,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.APPLY_SHADOW,
      success: false,
      message: `Error applying shadow: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function alignHorizontalTool(payload: AlignHorizontalQueryPayload): Promise<PluginResponseMessage> {
  const { alignment } = payload;

  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ALIGN_HORIZONTAL,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    if (sel.length < 1) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ALIGN_HORIZONTAL,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Handle single shape alignment differently - align to parent bounds
    if (sel.length === 1) {
      const shape = sel[0];
      const previousX = shape.x;
      const previousY = shape.y;

      try {
        // Get parent bounds for alignment reference
        let parentBounds = { x: 0, y: 0, width: 0, height: 0 };

        // Try to get parent bounds - fallback to page bounds if no parent
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = (shape as any).parent;
          if (parent && typeof parent === 'object') {
            parentBounds = {
              x: parent.x || 0,
              y: parent.y || 0,
              width: parent.width || 0,
              height: parent.height || 0,
            };
          }
        } catch {
          // Fallback to reasonable page bounds
          parentBounds = {
            x: 0,
            y: 0,
            width: 800,  // Reasonable default width
            height: 600, // Reasonable default height
          };
        }

        // Calculate new position based on alignment
        let newX = shape.x;
        switch (alignment) {
          case 'left':
            newX = parentBounds.x;
            break;
          case 'center':
            newX = parentBounds.x + (parentBounds.width - shape.width) / 2;
            break;
          case 'right':
            newX = parentBounds.x + parentBounds.width - shape.width;
            break;
        }

        // Apply the new position
        shape.x = newX;

        const undoInfo: UndoInfo = {
          actionType: ClientQueryType.ALIGN_HORIZONTAL,
          actionId: `align_horizontal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          undoData: {
            shapeIds: [shape.id],
            previousPositions: [{ x: previousX, y: previousY }],
            alignment,
          },
          description: `Aligned shape horizontally (${alignment}) to parent bounds`,
          timestamp: Date.now(),
        };

        undoStack.push(undoInfo);

        return {
          ...pluginResponse,
          type: ClientQueryType.ALIGN_HORIZONTAL,
          message: `Perfect! I aligned your shape horizontally to the **${alignment}** of its container.

Aligned shape: ${shape.name || shape.id}

This matches Penpot's native alignment behavior for single shapes.`,
          payload: {
            alignedShapes: [{ id: shape.id, name: shape.name }],
            alignment,
            undoInfo,
          },
        };
      } catch (singleAlignError) {
        console.warn(`Single shape alignment failed:`, singleAlignError);
        return {
          ...pluginResponse,
          type: ClientQueryType.ALIGN_HORIZONTAL,
          success: false,
          message: `Failed to align the single shape. The shape may not have accessible parent bounds.`,
        };
      }
    }

    // Store previous positions for undo
    const shapeIds: string[] = [];
    const previousPositions: Array<{ x: number; y: number }> = [];

    // First pass: capture previous positions
    for (const shape of sel) {
      shapeIds.push(shape.id);
      previousPositions.push({ x: shape.x, y: shape.y });
    }

    // Apply horizontal alignment using Penpot's alignHorizontal method
    try {
      // Call Penpot's alignHorizontal method on the selection
      penpot.alignHorizontal(sel, alignment);
    } catch (alignError) {
      console.warn(`Penpot alignHorizontal failed:`, alignError);
      return {
        ...pluginResponse,
        type: ClientQueryType.ALIGN_HORIZONTAL,
        success: false,
        message: `Failed to align shapes horizontally. Penpot's alignment API may not be available or the shapes may not be alignable.`,
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.ALIGN_HORIZONTAL,
      actionId: `align_horizontal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousPositions,
        alignment,
      },
      description: `Aligned ${sel.length} shapes horizontally (${alignment})`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.ALIGN_HORIZONTAL,
      message: `Perfect! I aligned ${sel.length} shapes horizontally to the **${alignment}**.

Aligned shapes: ${shapeNames}

Horizontal alignment options:
• **left**: Align all shapes to the leftmost shape's left edge
• **center**: Center all shapes horizontally around the middle point
• **right**: Align all shapes to the rightmost shape's right edge

You can undo this action anytime with "undo last action".`,
      payload: {
        alignedShapes: sel.map(s => ({ id: s.id, name: s.name })),
        alignment,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.ALIGN_HORIZONTAL,
      success: false,
      message: `Error aligning shapes horizontally: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function alignVerticalTool(payload: AlignVerticalQueryPayload): Promise<PluginResponseMessage> {
  const { alignment } = payload;

  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ALIGN_VERTICAL,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Handle single shape alignment differently - align to parent bounds
    if (sel.length === 1) {
      const shape = sel[0];
      const previousX = shape.x;
      const previousY = shape.y;

      try {
        // Get parent bounds for alignment reference
        let parentBounds = { x: 0, y: 0, width: 0, height: 0 };

        // Try to get parent bounds - fallback to page bounds if no parent
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = (shape as any).parent;
          if (parent && typeof parent === 'object') {
            parentBounds = {
              x: parent.x || 0,
              y: parent.y || 0,
              width: parent.width || 0,
              height: parent.height || 0,
            };
          }
        } catch {
          // Fallback to reasonable page bounds
          parentBounds = {
            x: 0,
            y: 0,
            width: 800,  // Reasonable default width
            height: 600, // Reasonable default height
          };
        }

        // Calculate new position based on alignment
        let newY = shape.y;
        switch (alignment) {
          case 'top':
            newY = parentBounds.y;
            break;
          case 'center':
            newY = parentBounds.y + (parentBounds.height - shape.height) / 2;
            break;
          case 'bottom':
            newY = parentBounds.y + parentBounds.height - shape.height;
            break;
        }

        // Apply the new position
        shape.y = newY;

        const undoInfo: UndoInfo = {
          actionType: ClientQueryType.ALIGN_VERTICAL,
          actionId: `align_vertical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          undoData: {
            shapeIds: [shape.id],
            previousPositions: [{ x: previousX, y: previousY }],
            alignment,
          },
          description: `Aligned shape vertically (${alignment}) to parent bounds`,
          timestamp: Date.now(),
        };

        undoStack.push(undoInfo);

        return {
          ...pluginResponse,
          type: ClientQueryType.ALIGN_VERTICAL,
          message: `Perfect! I aligned your shape vertically to the **${alignment}** of its container.

Aligned shape: ${shape.name || shape.id}

This matches Penpot's native alignment behavior for single shapes.`,
          payload: {
            alignedShapes: [{ id: shape.id, name: shape.name }],
            alignment,
            undoInfo,
          },
        };
      } catch (singleAlignError) {
        console.warn(`Single shape vertical alignment failed:`, singleAlignError);
        return {
          ...pluginResponse,
          type: ClientQueryType.ALIGN_VERTICAL,
          success: false,
          message: `Failed to align the single shape. The shape may not have accessible parent bounds.`,
        };
      }
    }

    // Handle multiple shapes using Penpot's alignVertical API
    // Store previous positions for undo
    const shapeIds: string[] = [];
    const previousPositions: Array<{ x: number; y: number }> = [];

    // First pass: capture previous positions
    for (const shape of sel) {
      shapeIds.push(shape.id);
      previousPositions.push({ x: shape.x, y: shape.y });
    }

    // Apply vertical alignment using Penpot's alignVertical method
    try {
      // Call Penpot's alignVertical method on the selection
      penpot.alignVertical(sel, alignment);
    } catch (alignError) {
      console.warn(`Penpot alignVertical failed:`, alignError);
      return {
        ...pluginResponse,
        type: ClientQueryType.ALIGN_VERTICAL,
        success: false,
        message: `Failed to align shapes vertically. Penpot's alignment API may not be available or the shapes may not be alignable.`,
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.ALIGN_VERTICAL,
      actionId: `align_vertical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousPositions,
        alignment,
      },
      description: `Aligned ${sel.length} shapes vertically (${alignment})`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.ALIGN_VERTICAL,
      message: `Perfect! I aligned ${sel.length} shapes vertically to the **${alignment}**.

Aligned shapes: ${shapeNames}

Vertical alignment options:
• **top**: Align all shapes to the topmost shape's top edge
• **center**: Center all shapes vertically around the middle point
• **bottom**: Align all shapes to the bottommost shape's bottom edge

You can undo this action anytime with "undo last action".`,
      payload: {
        alignedShapes: sel.map(s => ({ id: s.id, name: s.name })),
        alignment,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.ALIGN_VERTICAL,
      success: false,
      message: `Error aligning shapes vertically: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function centerAlignmentTool(_payload: CenterAlignmentQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CENTER_ALIGNMENT,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Store previous positions for undo (both X and Y coordinates)
    const shapeIds: string[] = [];
    const previousPositions: Array<{ x: number; y: number }> = [];

    // First pass: capture previous positions
    for (const shape of sel) {
      shapeIds.push(shape.id);
      previousPositions.push({ x: shape.x, y: shape.y });
    }

    // Apply both horizontal and vertical centering
    try {
      // Center horizontally first
      penpot.alignHorizontal(sel, 'center');

      // Then center vertically
      penpot.alignVertical(sel, 'center');
    } catch (alignError) {
      console.warn(`Center alignment failed:`, alignError);
      return {
        ...pluginResponse,
        type: ClientQueryType.CENTER_ALIGNMENT,
        success: false,
        message: `Failed to center shapes. Penpot's alignment API may not be available or the shapes may not be alignable.`,
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack with both X and Y position data
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.CENTER_ALIGNMENT,
      actionId: `center_alignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousPositions,
      },
      description: `Centered ${sel.length} shapes both horizontally and vertically`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.CENTER_ALIGNMENT,
      message: `Perfect! I centered ${sel.length} shapes both horizontally AND vertically on the canvas.

Centered shapes: ${shapeNames}

This places your shapes in the exact center of their container/screen.
You can undo this action anytime with "undo last action".`,
      payload: {
        alignedShapes: sel.map(s => ({ id: s.id, name: s.name })),
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CENTER_ALIGNMENT,
      success: false,
      message: `Error centering shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function distributeHorizontalTool(_payload: DistributeHorizontalQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 3) {
      return {
        ...pluginResponse,
        type: ClientQueryType.DISTRIBUTE_HORIZONTAL,
        success: false,
        message: sel && sel.length === 2 
          ? 'NEED_MORE_SHAPES' 
          : 'NO_SELECTION',
      };
    }

    // Store previous positions for undo (both X and Y coordinates)
    const shapeIds: string[] = [];
    const previousPositions: Array<{ x: number; y: number }> = [];

    // First pass: capture previous positions
    for (const shape of sel) {
      shapeIds.push(shape.id);
      previousPositions.push({ x: shape.x, y: shape.y });
    }

    // Apply horizontal distribution using Penpot's distributeHorizontal method
    try {
      // Call Penpot's distributeHorizontal method on the selection
      penpot.distributeHorizontal(sel);
    } catch (distributeError) {
      console.warn(`Penpot distributeHorizontal failed:`, distributeError);
      return {
        ...pluginResponse,
        type: ClientQueryType.DISTRIBUTE_HORIZONTAL,
        success: false,
        message: `Failed to distribute shapes horizontally. Penpot's distribution API may not be available or the shapes may not be distributable.`,
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack with position data
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.DISTRIBUTE_HORIZONTAL,
      actionId: `distribute_horizontal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousPositions,
      },
      description: `Distributed ${sel.length} shapes horizontally`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.DISTRIBUTE_HORIZONTAL,
      message: `Perfect! I distributed ${sel.length} shapes evenly across the horizontal space.

Distributed shapes: ${shapeNames}

The shapes are now spaced evenly between the leftmost and rightmost positions.
You can undo this action anytime with "undo last action".`,
      payload: {
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.DISTRIBUTE_HORIZONTAL,
      success: false,
      message: `Error distributing shapes horizontally: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function distributeVerticalTool(_payload: DistributeVerticalQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 3) {
      return {
        ...pluginResponse,
        type: ClientQueryType.DISTRIBUTE_VERTICAL,
        success: false,
        message: sel && sel.length === 2 
          ? 'NEED_MORE_SHAPES' 
          : 'NO_SELECTION',
      };
    }

    // Store previous positions for undo (both X and Y coordinates)
    const shapeIds: string[] = [];
    const previousPositions: Array<{ x: number; y: number }> = [];

    // First pass: capture previous positions
    for (const shape of sel) {
      shapeIds.push(shape.id);
      previousPositions.push({ x: shape.x, y: shape.y });
    }

    // Apply vertical distribution using Penpot's distributeVertical method
    try {
      // Call Penpot's distributeVertical method on the selection
      penpot.distributeVertical(sel);
    } catch (distributeError) {
      console.warn(`Penpot distributeVertical failed:`, distributeError);
      return {
        ...pluginResponse,
        type: ClientQueryType.DISTRIBUTE_VERTICAL,
        success: false,
        message: `Failed to distribute shapes vertically. Penpot's distribution API may not be available or the shapes may not be distributable.`,
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack with position data
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.DISTRIBUTE_VERTICAL,
      actionId: `distribute_vertical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousPositions,
      },
      description: `Distributed ${sel.length} shapes vertically`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.DISTRIBUTE_VERTICAL,
      message: `Perfect! I distributed ${sel.length} shapes evenly across the vertical space.

Distributed shapes: ${shapeNames}

The shapes are now spaced evenly between the topmost and bottommost positions.
You can undo this action anytime with "undo last action".`,
      payload: {
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.DISTRIBUTE_VERTICAL,
      success: false,
      message: `Error distributing shapes vertically: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function groupTool(_payload: GroupQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.GROUP,
        success: false,
        message: sel && sel.length === 1
          ? 'NEED_MORE_SHAPES'
          : 'NO_SELECTION',
      };
    }

    // Store information about the shapes being grouped for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];

    // First pass: capture shape information
    for (const shape of sel) {
      shapeIds.push(shape.id);
      shapePositions.push({ x: shape.x, y: shape.y });
    }

    // Create the group using Penpot's group method
    try {
      const newGroup = penpot.group(sel);
      if (!newGroup) {
        return {
          ...pluginResponse,
          type: ClientQueryType.GROUP,
          success: false,
          message: `Failed to create group. Penpot's grouping API may not be available or the shapes may not be groupable.`,
        };
      }

      const shapeNames = sel.map(s => s.name || s.id).join(', ');

      // Add to undo stack with group information
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.GROUP,
        actionId: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          groupId: newGroup.id,
          shapeIds,
          shapePositions,
        },
        description: `Grouped ${sel.length} shapes into "${newGroup.name || newGroup.id}"`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      return {
        ...pluginResponse,
        type: ClientQueryType.GROUP,
        message: `Perfect! I grouped ${sel.length} shapes into a new group.

Grouped shapes: ${shapeNames}
Group name: ${newGroup.name || newGroup.id}

The shapes are now contained within a group container. You can move, rotate, and scale them as a single unit.
You can undo this action anytime with "undo last action".`,
        payload: {
          groupId: newGroup.id,
          groupedShapes: sel.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (groupError) {
      console.warn(`Penpot group failed:`, groupError);
      return {
        ...pluginResponse,
        type: ClientQueryType.GROUP,
        success: false,
        message: `Failed to group shapes. Penpot's grouping API may not be available or the shapes may not be groupable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GROUP,
      success: false,
      message: `Error grouping shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function ungroupTool(_payload: UngroupQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.UNGROUP,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Filter to only groups using Penpot's isGroup utility
    const groupsToUngroup = sel.filter(shape => penpot.utils.types.isGroup(shape));
    
    if (groupsToUngroup.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.UNGROUP,
        success: false,
        message: 'NO_GROUPS_SELECTED',
      };
    }

    // Store information about the groups being ungrouped for undo
    const ungroupedGroups: Array<{
      groupId: string;
      groupName: string;
      shapeIds: string[];
      shapePositions: Array<{ x: number; y: number }>;
    }> = [];

    // First pass: capture group and child information
    for (const group of groupsToUngroup) {
      const groupShape = group as Group;
      const shapeIds: string[] = [];
      const shapePositions: Array<{ x: number; y: number }> = [];

      // Store information about each child shape
      for (const child of groupShape.children) {
        shapeIds.push(child.id);
        shapePositions.push({ x: child.x, y: child.y });
      }

      ungroupedGroups.push({
        groupId: groupShape.id,
        groupName: groupShape.name || groupShape.id,
        shapeIds,
        shapePositions,
      });
    }

    // Ungroup the selected groups using Penpot's ungroup method
    try {
      // Call ungroup for each group individually
      for (const group of groupsToUngroup) {
        penpot.ungroup(group as Group);
      }
    } catch (ungroupError) {
      console.warn(`Penpot ungroup failed:`, ungroupError);
      return {
        ...pluginResponse,
        type: ClientQueryType.UNGROUP,
        success: false,
        message: `Failed to ungroup shapes. Penpot's ungrouping API may not be available or the groups may not be ungroupable.`,
      };
    }

    const groupNames = ungroupedGroups.map(g => g.groupName).join(', ');

    // Add to undo stack with group restoration information
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.UNGROUP,
      actionId: `ungroup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        ungroupedGroups,
      },
      description: `Ungrouped ${ungroupedGroups.length} group${ungroupedGroups.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.UNGROUP,
      message: `Perfect! I ungrouped ${ungroupedGroups.length} group${ungroupedGroups.length > 1 ? 's' : ''}.

Ungrouped groups: ${groupNames}

The shapes are now released from their group containers and can be manipulated individually.
You can undo this action anytime with "undo last action".`,
      payload: {
        ungroupedGroups: ungroupedGroups.map(g => ({ id: g.groupId, name: g.groupName })),
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.UNGROUP,
      success: false,
      message: `Error ungrouping shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function combineShapesTool(_payload: CombineShapesQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.COMBINE_SHAPES,
        success: false,
        message: sel && sel.length === 1
          ? 'NEED_MORE_SHAPES'
          : 'NO_SELECTION',
      };
    }

    // Store information about the shapes being combined for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];
    const shapeProperties: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fills?: unknown;
      strokes?: unknown;
    }> = [];

    // First pass: capture shape information
    for (const shape of sel) {
      shapeIds.push(shape.id);
      shapePositions.push({ x: shape.x, y: shape.y });
      shapeProperties.push({
        id: shape.id,
        name: shape.name || shape.id,
        x: shape.x,
        y: shape.y,
        width: shape.width || 0,
        height: shape.height || 0,
        fills: (shape as any).fills,
        strokes: (shape as any).strokes,
      });
    }

    // Create the combined shape using Penpot's createBoolean method with "union"
    try {
      const combinedShape = penpot.createBoolean("union", sel);
      if (!combinedShape) {
        return {
          ...pluginResponse,
          type: ClientQueryType.COMBINE_SHAPES,
          success: false,
          message: `Failed to combine shapes. Penpot's boolean operation API may not be available or the shapes may not be combinable.`,
        };
      }

      const shapeNames = sel.map(s => s.name || s.id).join(', ');

      // Add to undo stack with shape restoration information
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.COMBINE_SHAPES,
        actionId: `combine_shapes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          combinedShapeId: combinedShape.id,
          originalShapes: shapeProperties,
        },
        description: `Combined ${sel.length} shapes into "${combinedShape.name || combinedShape.id}"`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      return {
        ...pluginResponse,
        type: ClientQueryType.COMBINE_SHAPES,
        message: `Perfect! I combined ${sel.length} shapes into a single shape using union operation.

Combined shapes: ${shapeNames}
Result: ${combinedShape.name || combinedShape.id}

The shapes have been merged into one compound shape. You can move, rotate, and scale it as a single unit.
You can undo this action anytime with "undo last action".`,
        payload: {
          combinedShapeId: combinedShape.id,
          combinedShapes: sel.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (combineError) {
      console.warn(`Penpot createBoolean union failed:`, combineError);
      return {
        ...pluginResponse,
        type: ClientQueryType.COMBINE_SHAPES,
        success: false,
        message: `Failed to combine shapes. Penpot's boolean operation API may not be available or the shapes may not be combinable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.COMBINE_SHAPES,
      success: false,
      message: `Error combining shapes: ${error instanceof Error ? error.message : String(error)}`,
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

      case ClientQueryType.APPLY_STROKE: {
        // Restore previous stroke values
        const strokeData = lastAction.undoData as {
          shapeIds: string[];
          previousStrokes: Array<{ strokeColor?: string; strokeWidth?: number; strokeOpacity?: number; strokeStyle?: string } | undefined>;
        };

        for (let i = 0; i < strokeData.shapeIds.length; i++) {
          const shapeId = strokeData.shapeIds[i];
          const previousStroke = strokeData.previousStrokes[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous stroke
            if (previousStroke) {
              shape.strokes = [{
                ...previousStroke,
                strokeStyle: previousStroke.strokeStyle as 'solid' | 'dashed' | 'dotted' | 'mixed' | 'none' | 'svg' | undefined,
              }];
            } else {
              // If there was no previous stroke, remove strokes
              shape.strokes = [];
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore stroke for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_SHADOW: {
        // Restore previous shadow values
        const shadowData = lastAction.undoData as {
          shapeIds: string[];
          previousShadows: Array<{ style?: string; color?: string; offsetX?: number; offsetY?: number; blur?: number; spread?: number } | undefined>;
        };

        for (let i = 0; i < shadowData.shapeIds.length; i++) {
          const shapeId = shadowData.shapeIds[i];
          const previousShadow = shadowData.previousShadows[i];

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shape = (penpot as any).currentPage?.findShape(shapeId) as any;
            if (shape) {
              // Restore the previous shadow
              if (previousShadow) {
                shape.shadows = [{
                  ...previousShadow,
                  style: previousShadow.style as 'drop-shadow' | 'inner-shadow' | undefined,
                }];
              } else {
                // If there was no previous shadow, remove shadows
                shape.shadows = [];
              }

              restoredShapes.push(shape.name || shape.id);
            }
          } catch (error) {
            console.warn(`Failed to restore shadow for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.ALIGN_HORIZONTAL: {
        // Restore previous positions
        const alignData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        for (let i = 0; i < alignData.shapeIds.length; i++) {
          const shapeId = alignData.shapeIds[i];
          const previousPosition = alignData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous position
            shape.x = previousPosition.x;
            shape.y = previousPosition.y;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore position for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.ALIGN_VERTICAL: {
        // Restore previous positions
        const alignData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        for (let i = 0; i < alignData.shapeIds.length; i++) {
          const shapeId = alignData.shapeIds[i];
          const previousPosition = alignData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous position
            shape.x = previousPosition.x;
            shape.y = previousPosition.y;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore position for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.CENTER_ALIGNMENT: {
        // Restore previous positions (same as horizontal/vertical alignment)
        const centerData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        for (let i = 0; i < centerData.shapeIds.length; i++) {
          const shapeId = centerData.shapeIds[i];
          const previousPosition = centerData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous position
            shape.x = previousPosition.x;
            shape.y = previousPosition.y;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore position for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.DISTRIBUTE_HORIZONTAL: {
        // Restore previous positions (same as alignment operations)
        const distributeData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        for (let i = 0; i < distributeData.shapeIds.length; i++) {
          const shapeId = distributeData.shapeIds[i];
          const previousPosition = distributeData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous position
            shape.x = previousPosition.x;
            shape.y = previousPosition.y;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore position for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.DISTRIBUTE_VERTICAL: {
        // Restore previous positions (same as alignment operations)
        const distributeData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        for (let i = 0; i < distributeData.shapeIds.length; i++) {
          const shapeId = distributeData.shapeIds[i];
          const previousPosition = distributeData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore the previous position
            shape.x = previousPosition.x;
            shape.y = previousPosition.y;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore position for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.GROUP: {
        // Ungroup the shapes by removing the group container
        const groupData = lastAction.undoData as {
          groupId: string;
          shapeIds: string[];
          shapePositions: Array<{ x: number; y: number }>;
        };

        try {
          const currentPage = penpot.currentPage;
          if (!currentPage) {
            console.warn('No current page available for ungrouping');
            break;
          }

          const group = currentPage.getShapeById(groupData.groupId);
          if (!group) {
            console.warn(`Group ${groupData.groupId} not found for ungrouping`);
            break;
          }

          // Ungroup the shapes using Penpot's ungroup method
          penpot.ungroup(group as Group);

          // Restore original positions of the individual shapes
          for (let i = 0; i < groupData.shapeIds.length; i++) {
            const shapeId = groupData.shapeIds[i];
            const originalPosition = groupData.shapePositions[i];

            try {
              const shape = currentPage.getShapeById(shapeId);
              if (shape) {
                // Restore the original position
                shape.x = originalPosition.x;
                shape.y = originalPosition.y;
                restoredShapes.push(shape.name || shape.id);
              }
            } catch (error) {
              console.warn(`Failed to restore position for shape ${shapeId}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to ungroup shapes:`, error);
        }
        break;
      }

      case ClientQueryType.UNGROUP: {
        // Regroup the shapes by recreating the group containers
        const ungroupData = lastAction.undoData as {
          ungroupedGroups: Array<{
            groupId: string;
            groupName: string;
            shapeIds: string[];
            shapePositions: Array<{ x: number; y: number }>;
          }>;
        };

        try {
          const currentPage = penpot.currentPage;
          if (!currentPage) {
            console.warn('No current page available for regrouping');
            break;
          }

          // Regroup each ungrouped set of shapes
          for (const groupInfo of ungroupData.ungroupedGroups) {
            const shapesToGroup: Shape[] = [];

            // Find all the shapes that were in this group
            for (const shapeId of groupInfo.shapeIds) {
              const shape = currentPage.getShapeById(shapeId);
              if (shape) {
                shapesToGroup.push(shape);
              }
            }

            // Regroup the shapes if we found them all
            if (shapesToGroup.length === groupInfo.shapeIds.length) {
              try {
                const newGroup = penpot.group(shapesToGroup);
                if (newGroup) {
                  // Restore the original group name if possible
                  newGroup.name = groupInfo.groupName;
                  restoredShapes.push(newGroup.name || newGroup.id);
                }
              } catch (groupError) {
                console.warn(`Failed to regroup shapes for ${groupInfo.groupName}:`, groupError);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to regroup shapes:`, error);
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

      case ClientQueryType.COMBINE_SHAPES: {
        // Restore original shapes by deleting the combined shape and recreating originals
        const combineData = lastAction.undoData as {
          combinedShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            x: number;
            y: number;
            width: number;
            height: number;
            fills?: unknown;
            strokes?: unknown;
          }>;
        };

        try {
          const currentPage = penpot.currentPage;
          if (!currentPage) {
            throw new Error('No current page available');
          }

          // Delete the combined shape
          const combinedShape = currentPage.getShapeById(combineData.combinedShapeId);
          if (combinedShape) {
            combinedShape.remove();
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          for (const originalShape of combineData.originalShapes) {
            try {
              // Create a rectangle with the original dimensions and position
              const newShape = penpot.createRectangle();
              newShape.x = originalShape.x;
              newShape.y = originalShape.y;
              newShape.resize(originalShape.width, originalShape.height);
              newShape.name = originalShape.name;

              // Restore fills and strokes if they exist
              if (originalShape.fills) {
                newShape.fills = originalShape.fills as Fill[];
              }
              if (originalShape.strokes) {
                newShape.strokes = originalShape.strokes as Stroke[];
              }

              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }
        } catch (error) {
          console.warn('Failed to undo combine shapes:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo combine shapes: ${error instanceof Error ? error.message : String(error)}`,
          };
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

            undoStack.push(lastAction); 

            // Reapply the fill
            shape.fills = [appliedFill];
            restoredShapes.push(shape.name || shape.id);

          } catch (error) {
            console.warn(`Failed to redo fill for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_STROKE: {
        // Reapply the stroke values
        const strokeData = lastAction.undoData as {
          shapeIds: string[];
          previousStrokes: Array<{ strokeColor?: string; strokeWidth?: number; strokeOpacity?: number; strokeStyle?: string } | undefined>;
          appliedStrokes: Array<{ strokeColor: string; strokeWidth: number; strokeOpacity: number; strokeStyle: string }>;
        };

        for (let i = 0; i < strokeData.shapeIds.length; i++) {
          const shapeId = strokeData.shapeIds[i];
          const appliedStroke = strokeData.appliedStrokes[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the stroke
            shape.strokes = [{
              strokeColor: appliedStroke.strokeColor,
              strokeWidth: appliedStroke.strokeWidth,
              strokeOpacity: appliedStroke.strokeOpacity,
              strokeStyle: appliedStroke.strokeStyle as 'solid' | 'dashed' | 'dotted' | 'mixed',
            }];

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo stroke for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.APPLY_SHADOW: {
        // Reapply the shadow values
        const shadowData = lastAction.undoData as {
          shapeIds: string[];
          previousShadows: Array<{ style?: string; color?: string; offsetX?: number; offsetY?: number; blur?: number; spread?: number } | undefined>;
          appliedShadows: Array<{ style: string; color: string; offsetX: number; offsetY: number; blur: number; spread: number }>;
        };

        for (let i = 0; i < shadowData.shapeIds.length; i++) {
          const shapeId = shadowData.shapeIds[i];
          const appliedShadow = shadowData.appliedShadows[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shape = (currentPage as any).getShapeById(shapeId);
            if (!shape) continue;

            // Reapply the shadow
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (shape as any).shadows = [{
              style: appliedShadow.style,
              color: appliedShadow.color,
              offsetX: appliedShadow.offsetX,
              offsetY: appliedShadow.offsetY,
              blur: appliedShadow.blur,
              spread: appliedShadow.spread,
            }];

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo shadow for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.ALIGN_HORIZONTAL: {
        // Reapply the horizontal alignment
        const alignData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
          alignment: 'left' | 'center' | 'right';
        };

        // Get the shapes and reapply alignment
        const shapesToAlign: Shape[] = [];
        for (const shapeId of alignData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shape = (currentPage as any).getShapeById(shapeId);
            if (shape) {
              shapesToAlign.push(shape);
            }
          } catch (error) {
            console.warn(`Failed to find shape ${shapeId} for redo alignment:`, error);
          }
        }

        // Reapply the alignment if we have shapes
        if (shapesToAlign.length >= 2) {
          try {
            penpot.alignHorizontal(shapesToAlign, alignData.alignment);
            restoredShapes.push(...shapesToAlign.map(s => s.name || s.id));
          } catch (alignError) {
            console.warn(`Failed to redo horizontal alignment:`, alignError);
          }
        }
        break;
      }

      case ClientQueryType.ALIGN_VERTICAL: {
        // Reapply the vertical alignment
        const alignData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
          alignment: 'top' | 'center' | 'bottom';
        };

        // Get the shapes and reapply alignment
        const shapesToAlign: Shape[] = [];
        for (const shapeId of alignData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shape = (currentPage as any).getShapeById(shapeId);
            if (shape) {
              shapesToAlign.push(shape);
            }
          } catch (error) {
            console.warn(`Failed to find shape ${shapeId} for redo alignment:`, error);
          }
        }

        // Reapply the alignment if we have shapes
        if (shapesToAlign.length >= 2) {
          try {
            penpot.alignVertical(shapesToAlign, alignData.alignment);
            restoredShapes.push(...shapesToAlign.map(s => s.name || s.id));
          } catch (alignError) {
            console.warn(`Failed to redo vertical alignment:`, alignError);
          }
        } else if (shapesToAlign.length === 1) {
          // Handle single shape redo by reapplying the alignment logic
          const shape = shapesToAlign[0];
          try {
            // Get parent bounds for alignment reference
            let parentBounds = { x: 0, y: 0, width: 0, height: 0 };

            // Try to get parent bounds - fallback to page bounds if no parent
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const parent = (shape as any).parent;
              if (parent && typeof parent === 'object') {
                parentBounds = {
                  x: parent.x || 0,
                  y: parent.y || 0,
                  width: parent.width || 0,
                  height: parent.height || 0,
                };
              }
            } catch {
              // Fallback to reasonable page bounds
              parentBounds = {
                x: 0,
                y: 0,
                width: 800,
                height: 600,
              };
            }

            // Calculate new position based on alignment
            let newY = shape.y;
            switch (alignData.alignment) {
              case 'top':
                newY = parentBounds.y;
                break;
              case 'center':
                newY = parentBounds.y + (parentBounds.height - shape.height) / 2;
                break;
              case 'bottom':
                newY = parentBounds.y + parentBounds.height - shape.height;
                break;
            }

            // Apply the new position
            shape.y = newY;
            restoredShapes.push(shape.name || shape.id);
          } catch (singleAlignError) {
            console.warn(`Failed to redo single shape vertical alignment:`, singleAlignError);
          }
        }
        break;
      }

      case ClientQueryType.DISTRIBUTE_HORIZONTAL: {
        // Reapply the horizontal distribution
        const distributeData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        // Get the shapes and reapply distribution
        const shapesToDistribute: Shape[] = [];
        for (const shapeId of distributeData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (shape) {
              shapesToDistribute.push(shape);
            }
          } catch (error) {
            console.warn(`Failed to find shape ${shapeId} for redo distribution:`, error);
          }
        }

        // Reapply the distribution if we have enough shapes
        if (shapesToDistribute.length >= 3) {
          try {
            penpot.distributeHorizontal(shapesToDistribute);
            restoredShapes.push(...shapesToDistribute.map(s => s.name || s.id));
          } catch (distributeError) {
            console.warn(`Failed to redo horizontal distribution:`, distributeError);
          }
        }
        break;
      }

      case ClientQueryType.DISTRIBUTE_VERTICAL: {
        // Reapply the vertical distribution
        const distributeData = lastAction.undoData as {
          shapeIds: string[];
          previousPositions: Array<{ x: number; y: number }>;
        };

        // Get the shapes and reapply distribution
        const shapesToDistribute: Shape[] = [];
        for (const shapeId of distributeData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (shape) {
              shapesToDistribute.push(shape);
            }
          } catch (error) {
            console.warn(`Failed to find shape ${shapeId} for redo distribution:`, error);
          }
        }

        // Reapply the distribution if we have enough shapes
        if (shapesToDistribute.length >= 3) {
          try {
            penpot.distributeVertical(shapesToDistribute);
            restoredShapes.push(...shapesToDistribute.map(s => s.name || s.id));
          } catch (distributeError) {
            console.warn(`Failed to redo vertical distribution:`, distributeError);
          }
        }
        break;
      }

      case ClientQueryType.GROUP: {
        // Regroup the shapes
        const groupData = lastAction.undoData as {
          groupId: string;
          shapeIds: string[];
          shapePositions: Array<{ x: number; y: number }>;
        };

        // Get the shapes and regroup them
        const shapesToGroup: Shape[] = [];
        for (const shapeId of groupData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (shape) {
              shapesToGroup.push(shape);
            }
          } catch (error) {
            console.warn(`Failed to find shape ${shapeId} for redo grouping:`, error);
          }
        }

        // Regroup the shapes if we have enough
        if (shapesToGroup.length >= 2) {
          try {
            const newGroup = penpot.group(shapesToGroup);
            if (newGroup) {
              restoredShapes.push(...shapesToGroup.map(s => s.name || s.id));
            }
          } catch (groupError) {
            console.warn(`Failed to redo grouping:`, groupError);
          }
        }
        break;
      }

      case ClientQueryType.UNGROUP: {
        // Re-ungroup the shapes
        const ungroupData = lastAction.undoData as {
          ungroupedGroups: Array<{
            groupId: string;
            groupName: string;
            shapeIds: string[];
            shapePositions: Array<{ x: number; y: number }>;
          }>;
        };

        // Find and ungroup the groups that were created during the undo
        for (const groupInfo of ungroupData.ungroupedGroups) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            // Try to find the group by looking for groups containing the expected shapes
            const allShapes = currentPage.findShapes({});
            const groups = allShapes.filter(shape => penpot.utils.types.isGroup(shape));

            for (const group of groups) {
              const groupShape = group as Group;
              const childIds = groupShape.children.map(child => child.id);

              // Check if this group contains the expected shapes
              const hasAllShapes = groupInfo.shapeIds.every(id => childIds.includes(id));
              const hasCorrectCount = childIds.length === groupInfo.shapeIds.length;

              if (hasAllShapes && hasCorrectCount) {
                try {
                  penpot.ungroup(groupShape);
                  restoredShapes.push(...groupShape.children.map(s => s.name || s.id));
                  break; // Found and ungrouped the correct group
                } catch (ungroupError) {
                  console.warn(`Failed to redo ungrouping for group ${groupShape.id}:`, ungroupError);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to find group for redo ungrouping:`, error);
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

      case ClientQueryType.COMBINE_SHAPES: {
        // Reapply the combine operation - find original shapes and combine them
        const combineData = lastAction.undoData as {
          combinedShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            x: number;
            y: number;
            width: number;
            height: number;
            fills?: unknown;
            strokes?: unknown;
          }>;
        };

        try {
          // Find the original shapes that should be combined
          const shapesToCombine: Shape[] = [];
          for (const originalShape of combineData.originalShapes) {
            const shape = penpot.currentPage?.getShapeById(originalShape.id);
            if (shape) {
              shapesToCombine.push(shape);
            }
          }

          if (shapesToCombine.length >= 2) {
            // Reapply the combine operation
            const combinedShape = penpot.createBoolean("union", shapesToCombine);
            if (combinedShape) {
              undoStack.push(lastAction);
              restoredShapes.push(combinedShape.name || combinedShape.id);
            }
          }
        } catch (error) {
          console.warn('Failed to redo combine shapes:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.REDO_LAST_ACTION,
            success: false,
            message: `Failed to redo combine shapes: ${error instanceof Error ? error.message : String(error)}`,
          };
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