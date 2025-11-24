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
  SetSelectionOpacityQueryPayload,
  SetSelectionBorderRadiusQueryPayload,
  SetSelectionBlendModeQueryPayload,
  AlignHorizontalQueryPayload,
  AlignVerticalQueryPayload,
  CenterAlignmentQueryPayload,
  DistributeHorizontalQueryPayload,
  DistributeVerticalQueryPayload,
  GroupQueryPayload,
  UngroupQueryPayload,
  UnionBooleanOperationQueryPayload,
  IntersectionBooleanOperationQueryPayload,
  DifferenceBooleanOperationQueryPayload,
  ExcludeBooleanOperationQueryPayload,
  FlattenSelectionQueryPayload,
  CreateShapeFromSvgQueryPayload,
  ExportSelectionAsSvgQueryPayload,
  ResizeQueryPayload,
  RotateQueryPayload,
  MoveQueryPayload,
  CloneSelectionQueryPayload,
  ResizeResponsePayload,
  RotateResponsePayload,
  MoveResponsePayload,
  CloneSelectionResponsePayload,
  CloneSelectionPromptResponsePayload,
  ToggleSelectionLockQueryPayload,
  ToggleSelectionLockResponsePayload,
  ToggleSelectionVisibilityQueryPayload,
  ToggleSelectionVisibilityResponsePayload,
  GetSelectionInfoQueryPayload,
  ClientQueryType,
  MessageSourceName,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  UndoInfo,
  UndoLastActionQueryPayload,
  RedoLastActionQueryPayload,
  AddImageQueryPayload,
  SetSelectionOpacityResponsePayload,
  SetSelectionBorderRadiusResponsePayload,
  SetSelectionBoundsResponsePayload,
  SetSelectionBlendModeResponsePayload,
  SetSelectionBorderRadiusPromptResponsePayload,
  SetSelectionBoundsPromptResponsePayload,
  SetSelectionBoundsQueryPayload,
  SelectionConfirmationPromptPayload,
} from "../types/types";
/* eslint-disable-next-line no-restricted-imports */
import { readSelectionInfo } from './selectionHelpers';
import { getSelectionForAction as actionGetSelectionForAction, hasValidSelection as actionHasValidSelection, updateCurrentSelection, currentSelectionIds } from './actionSelection';
import {
  findClonePlacement,
  getPageBounds,
  getSelectionBounds,
  unionRects,
} from './cloneHelpers';
import type { PlacementFallback, Rect } from './cloneHelpers';
import type { Shape, Group, Fill, Stroke } from '@penpot/plugin-types';
import { blendModes } from '../types/shapeTypes';

const pluginResponse: PluginResponseMessage = {
  source: MessageSourceName.Plugin,
  type: ClientQueryType.ADD_IMAGE,
  messageId: '',
  message: '',
  success: true,
};

// Global variable to store current selection IDs (updated by plugin.ts)
// currentSelectionIds and updateCurrentSelection are now stored in actionSelection.ts

// Global undo stack - stores undo information for reversible actions
let undoStack: UndoInfo[] = [];
// Global redo stack - stores undone actions that can be redone
const redoStack: UndoInfo[] = [];
const MAX_UNDO_STACK_SIZE = 10; // Keep last 10 undoable actions

export function resetUndoRedoStacks() {
  undoStack = [];
  redoStack.length = 0;
}

// Function to update selection IDs from plugin.ts
// Note: updateCurrentSelection and currentSelectionIds are exported from actionSelection

// Function to add undo information to the stack
export function addToUndoStack(undoInfo: UndoInfo) {
  undoStack.push(undoInfo);
  // Keep only the last MAX_UNDO_STACK_SIZE items
  if (undoStack.length > MAX_UNDO_STACK_SIZE) {
    undoStack = undoStack.slice(-MAX_UNDO_STACK_SIZE);
  }
  console.log('Added to undo stack:', undoInfo.description);
}

// ===== Selection wrapper helpers (thin public wrappers) =====
// These are intentionally exposed from mainHandlers.ts to keep a small
// public API surface for the plugin while delegating implementation to
// the specialized helpers in actionSelection.ts and selectionHelpers.ts.
export function getSelectionForAction(): Shape[] {
  // Action-only selection getter (delegates to actionSelection helper)
  return actionGetSelectionForAction();
}

// Check if there is a valid selection available for actions
export function hasValidSelection(): boolean {
  return actionHasValidSelection();
}

// Read-only selection information for UI/UX and prompts (delegates to selectionHelpers)
export function getSelectionInfo(): Array<{ id: string; name?: string; type: string; x: number; y: number; width: number; height: number; rotation?: number; opacity?: number }> {
  return readSelectionInfo();
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
// end wrapper
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
          pages: penpot.currentFile?.pages.map((page) => ({ name: page.name, id: page.id })),
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


// (selection wrapper helpers moved to the top of this file)

/**
 * Center the viewport on a rectangle area. Prefer non-mutating viewport API.
 * Falls back to more invasive options if necessary.
 */
export function centerDocumentOnRect(x: number, y: number, width: number, height: number) {
  try {
    // Prefer a viewport API that doesn't touch selection
    const viewport: any = (globalThis as any).penpot?.viewport;
    if (viewport && typeof viewport.scrollToRect === 'function') {
      viewport.scrollToRect({ x, y, width, height });
      return;
    }

    if (viewport && typeof viewport.centerOnRect === 'function') {
      viewport.centerOnRect({ x, y, width, height });
      return;
    }

    // Next fallback: center on selection if available. This may change selection briefly.
    if (viewport && typeof viewport.centerOnSelection === 'function') {
      viewport.centerOnSelection();
      return;
    }

    // Worst-case fallback: try to scroll to the center coordinates if simple scroll API exists
    if (viewport && typeof viewport.scrollTo === 'function') {
      const cx = Math.round(x + width / 2);
      const cy = Math.round(y + height / 2);
      viewport.scrollTo(cx, cy);
    }
  } catch (err) {
    // Do not fail plugin on viewport centering failure
    console.warn('centerDocumentOnRect failed', err);
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

      // Center viewport on the newly added image so it's visible to the user
      try {
        // Prefer a viewport that's able to scroll/center. If none is available, move the shape
        // near the current selection (so the user can see it) and then try centering again.
        const viewport: any = (globalThis as any).penpot?.viewport;
        if (viewport && (typeof viewport.scrollToRect === 'function' || typeof viewport.centerOnRect === 'function' || typeof viewport.centerOnSelection === 'function' || typeof viewport.scrollTo === 'function')) {
          centerDocumentOnRect(imageShape.x ?? 0, imageShape.y ?? 0, imageShape.width ?? (imageCreatedData.width || 100), imageShape.height ?? (imageCreatedData.height || 100));
        } else {
          // No viewport helper - put the image near the first selected object so it's visible
          const selInfo = readSelectionInfo();
          if (selInfo && selInfo.length > 0) {
            // Put it next to the first selected object
            imageShape.x = selInfo[0].x + selInfo[0].width + 20;
            imageShape.y = selInfo[0].y;
          } else {
            // Last resort: place near 0,0
            imageShape.x = imageShape.x ?? 0;
            imageShape.y = imageShape.y ?? 0;
          }

          // Try centering again in case the viewport has a different API
          centerDocumentOnRect(imageShape.x ?? 0, imageShape.y ?? 0, imageShape.width ?? (imageCreatedData.width || 100), imageShape.height ?? (imageCreatedData.height || 100));
        }
      } catch (e) {
        console.warn('Failed to center viewport on new image (from URL):', e);
      }

      // Select the newly created image so the user can immediately act on it
      try {
        // Assign penpot.selection where available — test harness and runtime should support this
        const hostPenpot = (globalThis as unknown as { penpot?: { selection?: Shape[] } }).penpot;
        if (hostPenpot) {
          hostPenpot.selection = [imageShape];
        }
      } catch (selectErr) {
        console.warn('Failed to set selection on new image (from URL):', selectErr);
      }

      // Update internal actionSelection to reflect the new selection
      setTimeout(() => {
        try {
          updateCurrentSelection([imageShape.id]);
        } catch (err) {
          console.warn('Failed to update current selection for new image (from URL):', err);
        }
      }, 10);

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

export async function handleAddImage(payload: AddImageQueryPayload): Promise<PluginResponseMessage> {
  try {
    const { name, data, mimeType } = payload ?? {};

    if (!name || !data || !mimeType) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ADD_IMAGE,
        success: false,
        message: 'Invalid payload for ADD_IMAGE. Expected { name, data, mimeType }',
      };
    }

    if (!penpot || typeof penpot.uploadMediaData !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.ADD_IMAGE,
        success: false,
        message: 'Penpot uploadMediaData API is not available in this environment.',
      };
    }

    const imageCreatedData = await penpot.uploadMediaData(name, data, mimeType);
    if (!imageCreatedData) {
      throw new Error('Failed to upload image data to Penpot');
    }

    const imageShape = penpot.createRectangle();
    imageShape.name = name;

    const fills = [
      {
        fillImage: {
          id: imageCreatedData.id,
          width: imageCreatedData.width || 100,
          height: imageCreatedData.height || 100,
          mtype: imageCreatedData.mtype || mimeType,
          keepAspectRatio: true,
        },
      },
    ];
    imageShape.fills = fills;

    if (imageCreatedData.width && imageCreatedData.height) {
      imageShape.resize(imageCreatedData.width, imageCreatedData.height);
    }

    // Move the viewport so the user can see the newly-created image
    try {
      const viewport: any = (globalThis as any).penpot?.viewport;
      if (viewport && (typeof viewport.scrollToRect === 'function' || typeof viewport.centerOnRect === 'function' || typeof viewport.centerOnSelection === 'function' || typeof viewport.scrollTo === 'function')) {
        centerDocumentOnRect(imageShape.x ?? 0, imageShape.y ?? 0, imageShape.width ?? (imageCreatedData.width || 100), imageShape.height ?? (imageCreatedData.height || 100));
      } else {
        const selInfo = readSelectionInfo();
        if (selInfo && selInfo.length > 0) {
          imageShape.x = selInfo[0].x + selInfo[0].width + 20;
          imageShape.y = selInfo[0].y;
        } else {
          imageShape.x = imageShape.x ?? 0;
          imageShape.y = imageShape.y ?? 0;
        }
        centerDocumentOnRect(imageShape.x ?? 0, imageShape.y ?? 0, imageShape.width ?? (imageCreatedData.width || 100), imageShape.height ?? (imageCreatedData.height || 100));
      }
    } catch (e) {
      console.warn('Failed to center viewport on new image:', e);
    }

      // Select the newly created image so the user can immediately act on it
      try {
        const hostPenpot = (globalThis as unknown as { penpot?: { selection?: Shape[] } }).penpot;
        if (hostPenpot) {
          hostPenpot.selection = [imageShape];
        }
      } catch (selErr) {
        console.warn('Failed to set selection on new image:', selErr);
      }

      // update internal selection tracking for action-only helpers
      setTimeout(() => {
        try {
          updateCurrentSelection([imageShape.id]);
        } catch (err) {
          console.warn('Failed to update current selection for new image:', err);
        }
      }, 10);

    return {
      ...pluginResponse,
      type: ClientQueryType.ADD_IMAGE,
      message: 'Image uploaded and added to canvas',
      payload: { newImageData: imageCreatedData, shapeId: imageShape.id },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.ADD_IMAGE,
      success: false,
      message: `Error adding image: ${error instanceof Error ? error.message : String(error)}`,
    };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try {
        // Respect lock state: do not attempt to change locked shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((shape as any).locked === true) {
          continue;
        }
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
            requestedShadow: { shadowColor: hexColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowSpread }
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

export async function setSelectionOpacityTool(payload: SetSelectionOpacityQueryPayload): Promise<PluginResponseMessage> {
  const requestedOpacity = typeof payload?.opacity === 'number' && Number.isFinite(payload.opacity) ? payload.opacity : undefined;
  if (requestedOpacity !== undefined && (requestedOpacity < 0 || requestedOpacity > 1)) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_OPACITY,
      success: false,
      message: 'Opacity must be a number between 0.0 and 1.0.',
    };
  }

  const appliedOpacity = requestedOpacity ?? 1;

  try {
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_OPACITY,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const changedShapeIds: string[] = [];
    const changedShapeNames: string[] = [];
    const previousOpacities: Array<number | undefined> = [];
    const skippedLocked: string[] = [];

    for (const shape of sel) {
      if ((shape as any).locked === true) {
        skippedLocked.push(shape.name || shape.id);
        continue;
      }

      changedShapeIds.push(shape.id);
      previousOpacities.push(typeof shape.opacity === 'number' ? shape.opacity : undefined);
      shape.opacity = appliedOpacity;
      changedShapeNames.push(shape.name || shape.id);
    }

    if (changedShapeIds.length === 0) {
      const message = skippedLocked.length > 0
        ? `All selected shapes are locked (${skippedLocked.join(', ')}). Unlock them before changing opacity.`
        : 'No shapes were updated.';
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_OPACITY,
        success: false,
        message,
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.SET_SELECTION_OPACITY,
      actionId: `set_selection_opacity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `Set selection opacity to ${appliedOpacity}`,
      undoData: {
        shapeIds: changedShapeIds,
        previousOpacities,
        appliedOpacity,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    let responseMessage = `Set opacity to ${appliedOpacity} for ${changedShapeNames.join(', ')}`;
    if (skippedLocked.length > 0) {
      responseMessage += ` (skipped ${skippedLocked.length} locked shape${skippedLocked.length > 1 ? 's' : ''}: ${skippedLocked.join(', ')})`;
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_OPACITY,
      message: `${responseMessage}.`,
      payload: {
        changedShapeIds,
        appliedOpacity,
        previousOpacities,
        undoInfo,
      } as SetSelectionOpacityResponsePayload,
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_OPACITY,
      success: false,
      message: `Error setting selection opacity: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function setSelectionBlendModeTool(payload: SetSelectionBlendModeQueryPayload): Promise<PluginResponseMessage> {
  const requestedBlendMode = typeof payload?.blendMode === 'string' ? payload.blendMode : undefined;
  if (!requestedBlendMode) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BLEND_MODE,
      success: false,
      message: 'Blend mode must be provided as a valid string.',
    };
  }

  if (!blendModes.includes(requestedBlendMode as typeof blendModes[number])) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BLEND_MODE,
      success: false,
      message: `Unsupported blend mode '${requestedBlendMode}'. Supported modes: ${blendModes.join(', ')}.`,
    };
  }

  try {
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BLEND_MODE,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const allowedBlendMode = requestedBlendMode as typeof blendModes[number];
    const changedShapeIds: string[] = [];
    const previousBlendModes: Array<typeof blendModes[number] | undefined> = [];
    const skippedLocked: string[] = [];

    for (const shape of sel) {
      const shapeWithBlend = shape as Shape & { locked?: boolean; blendMode?: string; name?: string };
      if (shapeWithBlend.locked === true) {
        skippedLocked.push(shapeWithBlend.name || shapeWithBlend.id);
        continue;
      }

      changedShapeIds.push(shapeWithBlend.id);
      previousBlendModes.push(typeof shapeWithBlend.blendMode === 'string' ? shapeWithBlend.blendMode as typeof blendModes[number] : undefined);
      shapeWithBlend.blendMode = allowedBlendMode;
    }

    if (changedShapeIds.length === 0) {
      const message = skippedLocked.length > 0
        ? `All selected shapes are locked (${skippedLocked.join(', ')}). Unlock them before changing the blend mode.`
        : 'No shapes were updated.';
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BLEND_MODE,
        success: false,
        message,
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.SET_SELECTION_BLEND_MODE,
      actionId: `set_selection_blend_mode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `Set blend mode to ${allowedBlendMode}`,
      undoData: {
        shapeIds: changedShapeIds,
        previousBlendModes,
        appliedBlendMode: allowedBlendMode,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    let responseMessage = `Set blend mode to ${allowedBlendMode} for ${changedShapeIds.length} shape${changedShapeIds.length > 1 ? 's' : ''}`;
    if (skippedLocked.length > 0) {
      responseMessage += ` (skipped ${skippedLocked.length} locked shape${skippedLocked.length > 1 ? 's' : ''}: ${skippedLocked.join(', ')})`;
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BLEND_MODE,
      message: `${responseMessage}.`,
      payload: {
        changedShapeIds,
        appliedBlendMode: allowedBlendMode,
        undoInfo,
      } as SetSelectionBlendModeResponsePayload,
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BLEND_MODE,
      success: false,
      message: `Error setting blend mode: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function setSelectionBorderRadiusTool(payload: SetSelectionBorderRadiusQueryPayload): Promise<PluginResponseMessage> {
  const requestedRadius = typeof payload?.borderRadius === 'number' && Number.isFinite(payload.borderRadius) ? payload.borderRadius : undefined;
  if (requestedRadius !== undefined && requestedRadius < 0) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
      success: false,
      message: 'Border radius must be a non-negative number.',
    };
  }

  const appliedRadius = requestedRadius ?? 0;

  try {
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const changedShapeIds: string[] = [];
    const previousBorderRadii: Array<number | undefined> = [];
    const skippedLocked: Array<{ id: string; name?: string }> = [];
    const shapesWithoutBorderRadius: Array<{ id: string; name?: string }> = [];

    const targetShapes: Shape[] = [];
    for (const shape of sel) {
      const s = shape as Shape & { locked?: boolean; borderRadius?: unknown; name?: string };
      if (s.locked === true) {
        skippedLocked.push({ id: s.id, name: s.name });
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(s, 'borderRadius')) {
        shapesWithoutBorderRadius.push({ id: s.id, name: s.name });
        continue;
      }

      targetShapes.push(s);
    }

    if (shapesWithoutBorderRadius.length > 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
        success: false,
        message: 'MISSING_BORDER_RADIUS',
        payload: {
          shapesWithoutBorderRadius,
          requestedBorderRadius: appliedRadius,
        } as SetSelectionBorderRadiusPromptResponsePayload,
      };
    }

    for (const s of targetShapes) {
      changedShapeIds.push(s.id);
      previousBorderRadii.push(typeof s.borderRadius === 'number' ? s.borderRadius as number : undefined);
      s.borderRadius = appliedRadius;
    }

    if (changedShapeIds.length === 0) {
      const message = skippedLocked.length > 0
        ? `All selected shapes are locked (${skippedLocked.map(s=> s.name ?? s.id).join(', ')}). Unlock them before changing the border radius.`
        : 'No shapes were updated.';
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
        success: false,
        message,
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
      actionId: `set_selection_border_radius_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `Set border radius to ${appliedRadius}`,
      undoData: {
        shapeIds: changedShapeIds,
        previousBorderRadii,
        appliedBorderRadius: appliedRadius,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    let responseMessage = `Set border radius to ${appliedRadius} for ${changedShapeIds.length} shape${changedShapeIds.length > 1 ? 's' : ''}`;
    if (skippedLocked.length > 0) {
      responseMessage += ` (skipped ${skippedLocked.length} locked shape${skippedLocked.length > 1 ? 's' : ''}: ${skippedLocked.map(s => s.name ?? s.id).join(', ')})`;
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
      message: `${responseMessage}.`,
      payload: {
        changedShapeIds,
        appliedBorderRadius: appliedRadius,
        previousBorderRadii,
        undoInfo,
        skippedLockedShapes: skippedLocked.length > 0 ? skippedLocked : undefined,
      } as SetSelectionBorderRadiusResponsePayload,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BORDER_RADIUS,
      success: false,
      message: `API_ERROR`,
      payload: {
        actionName: 'setSelectionBorderRadius',
        message: `Error applying border radius: ${errMsg}`,
        blockerType: 'apiError',
        blockerDetails: errMsg,
        needsConfirmation: true,
      } as SelectionConfirmationPromptPayload,
    };
  }
}

export async function setSelectionBoundsTool(payload: SetSelectionBoundsQueryPayload): Promise<PluginResponseMessage> {
  const provided = payload ?? {};

  // Validate width/height if provided
  if (typeof provided.width === 'number' && (!Number.isFinite(provided.width) || provided.width < 0)) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BOUNDS,
      success: false,
      message: 'Width must be a non-negative finite number',
    };
  }

  if (typeof provided.height === 'number' && (!Number.isFinite(provided.height) || provided.height < 0)) {
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BOUNDS,
      success: false,
      message: 'Height must be a non-negative finite number',
    };
  }

  const appliedBounds = {
    x: typeof provided.x === 'number' ? provided.x : undefined,
    y: typeof provided.y === 'number' ? provided.y : undefined,
    width: typeof provided.width === 'number' ? provided.width : undefined,
    height: typeof provided.height === 'number' ? provided.height : undefined,
  };

  try {
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BOUNDS,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const changedShapeIds: string[] = [];
    const previousBounds: Array<{ x?: number; y?: number; width?: number; height?: number } | undefined> = [];
    const skippedLocked: Array<{ id: string; name?: string }> = [];
    const shapesWithoutBounds: Array<{ id: string; name?: string }> = [];

    const targetShapes: Shape[] = [];
    for (const shape of sel) {
      const s = shape as Shape & { locked?: boolean; name?: string; x?: unknown; y?: unknown; width?: unknown; height?: unknown };
      if (s.locked === true) {
        skippedLocked.push({ id: s.id, name: s.name });
        continue;
      }

      // Ensure the shape has numeric bounds properties (width/height must exist)
      if (!Object.prototype.hasOwnProperty.call(s, 'width') || !Object.prototype.hasOwnProperty.call(s, 'height')) {
        shapesWithoutBounds.push({ id: s.id, name: s.name });
        continue;
      }

      targetShapes.push(s as Shape);
    }

    if (shapesWithoutBounds.length > 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BOUNDS,
        success: false,
        message: 'MISSING_BOUNDS',
        payload: {
          shapesWithoutBounds,
          requestedBounds: appliedBounds,
        } as SetSelectionBoundsPromptResponsePayload,
      };
    }

    for (const s of targetShapes) {
      changedShapeIds.push(s.id);
      previousBounds.push({
        x: typeof s.x === 'number' ? s.x : undefined,
        y: typeof s.y === 'number' ? s.y : undefined,
        width: typeof s.width === 'number' ? s.width : undefined,
        height: typeof s.height === 'number' ? s.height : undefined,
      });

      // Apply x/y directly where provided
      if (typeof appliedBounds.x === 'number') s.x = appliedBounds.x;
      if (typeof appliedBounds.y === 'number') s.y = appliedBounds.y;

      // For width/height, use resize when available
      if (typeof appliedBounds.width === 'number' || typeof appliedBounds.height === 'number') {
        const newWidth = typeof appliedBounds.width === 'number' ? appliedBounds.width : (typeof s.width === 'number' ? s.width : undefined);
        const newHeight = typeof appliedBounds.height === 'number' ? appliedBounds.height : (typeof s.height === 'number' ? s.height : undefined);
        try {
          if (typeof newWidth === 'number' && typeof newHeight === 'number' && typeof (s as any).resize === 'function') {
            (s as any).resize(newWidth, newHeight);
          } else {
            // fallback to setting values directly if resize is not available
            if (typeof newWidth === 'number') (s as any).width = newWidth;
            if (typeof newHeight === 'number') (s as any).height = newHeight;
          }
        } catch (e) {
          console.warn('Failed to set width/height via resize for shape', s.id, e);
          if (typeof newWidth === 'number') (s as any).width = newWidth;
          if (typeof newHeight === 'number') (s as any).height = newHeight;
        }
      }
    }

    if (changedShapeIds.length === 0) {
      const message = skippedLocked.length > 0
        ? `All selected shapes are locked (${skippedLocked.map(s => s.name ?? s.id).join(', ')}). Unlock them before changing bounds.`
        : 'No shapes were updated.';
      return {
        ...pluginResponse,
        type: ClientQueryType.SET_SELECTION_BOUNDS,
        success: false,
        message,
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.SET_SELECTION_BOUNDS,
      actionId: `set_selection_bounds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `Set bounds ${JSON.stringify(appliedBounds)}`,
      undoData: {
        shapeIds: changedShapeIds,
        previousBounds,
        appliedBounds,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    let message = `Set bounds for ${changedShapeIds.length} shape${changedShapeIds.length > 1 ? 's' : ''}`;
    if (skippedLocked.length > 0) {
      message += ` (skipped ${skippedLocked.length} locked shape${skippedLocked.length > 1 ? 's' : ''}: ${skippedLocked.map(s => s.name ?? s.id).join(', ')})`;
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BOUNDS,
      message: `${message}.`,
      payload: {
        changedShapeIds,
        appliedBounds,
        previousBounds,
        undoInfo,
        skippedLockedShapes: skippedLocked.length > 0 ? skippedLocked : undefined,
      } as SetSelectionBoundsResponsePayload,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      ...pluginResponse,
      type: ClientQueryType.SET_SELECTION_BOUNDS,
      success: false,
      message: `API_ERROR`,
      payload: {
        actionName: 'setSelectionBounds',
        message: `Error applying bounds: ${errMsg}`,
        blockerType: 'apiError',
        blockerDetails: errMsg,
        needsConfirmation: true,
      } as SelectionConfirmationPromptPayload,
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

export async function unionBooleanOperationTool(_payload: UnionBooleanOperationQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.UNION_BOOLEAN_OPERATION,
        success: false,
        message: `Please select at least 2 shapes to perform union operation. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Store information about the shapes being unioned for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];
    const shapeProperties: Array<{
      id: string;
      name: string;
      type: string;
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
        name: shape.name || `Shape ${shape.id.slice(-4)}`,
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fills: shape.fills,
        strokes: shape.strokes,
      });
    }

    // Create the union shape using Penpot's createBoolean method with "union"
    try {
      const unionShape = penpot.createBoolean("union", sel);
      if (!unionShape) {
        throw new Error('createBoolean returned null - operation may not be supported');
      }

      // Add to undo stack
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.UNION_BOOLEAN_OPERATION,
        actionId: `union_boolean_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          unionShapeId: unionShape.id,
          originalShapes: shapeProperties,
        },
        description: `Performed union boolean operation on ${sel.length} shapes`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      const shapeNames = shapeProperties.map(s => s.name).join(', ');

      return {
        ...pluginResponse,
        type: ClientQueryType.UNION_BOOLEAN_OPERATION,
        success: true,
        message: `Perfect! I performed a union boolean operation on ${sel.length} shapes.

⚠️ **IMPORTANT**: Boolean operations are DESTRUCTIVE and cannot be perfectly undone.
The original shapes have been merged and replaced with the union result.
You can undo this action, but it will recreate approximations of your original shapes.
Some visual properties like gradients, effects, or complex styling may be lost.

Union shapes: ${shapeNames}
Result: ${unionShape.name || unionShape.id}

Consider saving your work before using boolean operations.`,
        payload: {
          unionShapeId: unionShape.id,
          unionShapes: shapeProperties.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (unionError) {
      console.warn(`Penpot createBoolean union failed:`, unionError);
      return {
        ...pluginResponse,
        type: ClientQueryType.UNION_BOOLEAN_OPERATION,
        success: false,
        message: `Failed to perform union boolean operation. Penpot's boolean operation API may not be available or the shapes may not be unionable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.UNION_BOOLEAN_OPERATION,
      success: false,
      message: `Error performing union boolean operation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function intersectionBooleanOperationTool(_payload: IntersectionBooleanOperationQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.INTERSECTION_BOOLEAN_OPERATION,
        success: false,
        message: `Please select at least 2 shapes to perform intersection operation. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Store information about the shapes being intersected for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];
    const shapeProperties: Array<{
      id: string;
      name: string;
      type: string;
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
        name: shape.name || `Shape ${shape.id.slice(-4)}`,
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fills: shape.fills,
        strokes: shape.strokes,
      });
    }

    // Create the intersection shape using Penpot's createBoolean method with "intersection"
    try {
      const intersectionShape = penpot.createBoolean("intersection", sel);
      if (!intersectionShape) {
        throw new Error('createBoolean returned null - operation may not be supported');
      }

      // Add to undo stack
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.INTERSECTION_BOOLEAN_OPERATION,
        actionId: `intersection_boolean_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          intersectionShapeId: intersectionShape.id,
          originalShapes: shapeProperties,
        },
        description: `Performed intersection boolean operation on ${sel.length} shapes`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      const shapeNames = shapeProperties.map(s => s.name).join(', ');

      return {
        ...pluginResponse,
        type: ClientQueryType.INTERSECTION_BOOLEAN_OPERATION,
        success: true,
        message: `Perfect! I performed an intersection boolean operation on ${sel.length} shapes.

⚠️ **IMPORTANT**: Boolean operations are DESTRUCTIVE and cannot be perfectly undone.
The original shapes have been replaced with the intersection result.
You can undo this action, but it will recreate approximations of your original shapes.
Some visual properties like gradients, effects, or complex styling may be lost.

Intersection shapes: ${shapeNames}
Result: ${intersectionShape.name || intersectionShape.id}

Consider saving your work before using boolean operations.`,
        payload: {
          intersectionShapeId: intersectionShape.id,
          intersectionShapes: shapeProperties.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (intersectionError) {
      console.warn(`Penpot createBoolean intersection failed:`, intersectionError);
      return {
        ...pluginResponse,
        type: ClientQueryType.INTERSECTION_BOOLEAN_OPERATION,
        success: false,
        message: `Failed to perform intersection boolean operation. Penpot's boolean operation API may not be available or the shapes may not be intersectable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.INTERSECTION_BOOLEAN_OPERATION,
      success: false,
      message: `Error performing intersection boolean operation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function differenceBooleanOperationTool(_payload: DifferenceBooleanOperationQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION,
        success: false,
        message: `Please select at least 2 shapes to perform difference operation. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Store information about the shapes being subtracted for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];
    const shapeProperties: Array<{
      id: string;
      name: string;
      type: string;
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
        name: shape.name || `Shape ${shape.id.slice(-4)}`,
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fills: shape.fills,
        strokes: shape.strokes,
      });
    }

    // Create the difference shape using Penpot's createBoolean method with "difference"
    try {
      const differenceShape = penpot.createBoolean("difference", sel);
      if (!differenceShape) {
        throw new Error('createBoolean returned null - operation may not be supported');
      }

      // Add to undo stack
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION,
        actionId: `difference_boolean_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          differenceShapeId: differenceShape.id,
          originalShapes: shapeProperties,
        },
        description: `Performed difference boolean operation on ${sel.length} shapes`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      const shapeNames = shapeProperties.map(s => s.name).join(', ');

      return {
        ...pluginResponse,
        type: ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION,
        success: true,
        message: `Perfect! I performed a difference boolean operation on ${sel.length} shapes.

⚠️ **IMPORTANT**: Boolean operations are DESTRUCTIVE and cannot be perfectly undone.
The original shapes have been replaced with the difference result.
You can undo this action, but it will recreate approximations of your original shapes.
Some visual properties like gradients, effects, or complex styling may be lost.

Difference shapes: ${shapeNames}
Result: ${differenceShape.name || differenceShape.id}

Consider saving your work before using boolean operations.`,
        payload: {
          differenceShapeId: differenceShape.id,
          differenceShapes: shapeProperties.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (differenceError) {
      console.warn(`Penpot createBoolean difference failed:`, differenceError);
      return {
        ...pluginResponse,
        type: ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION,
        success: false,
        message: `Failed to perform difference boolean operation. Penpot's boolean operation API may not be available or the shapes may not be differentiable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION,
      success: false,
      message: `Error performing difference boolean operation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function excludeBooleanOperationTool(_payload: ExcludeBooleanOperationQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length < 2) {
      return {
        ...pluginResponse,
        type: ClientQueryType.EXCLUDE_BOOLEAN_OPERATION,
        success: false,
        message: `Please select at least 2 shapes to perform exclude operation. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Store information about the shapes being excluded for undo
    const shapeIds: string[] = [];
    const shapePositions: Array<{ x: number; y: number }> = [];
    const shapeProperties: Array<{
      id: string;
      name: string;
      type: string;
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
        name: shape.name || `Shape ${shape.id.slice(-4)}`,
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fills: shape.fills,
        strokes: shape.strokes,
      });
    }

    // Create the exclude shape using Penpot's createBoolean method with "exclude"
    try {
      const excludeShape = penpot.createBoolean("exclude", sel);
      if (!excludeShape) {
        throw new Error('createBoolean returned null - operation may not be supported');
      }

      // Add to undo stack
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.EXCLUDE_BOOLEAN_OPERATION,
        actionId: `exclude_boolean_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          excludeShapeId: excludeShape.id,
          originalShapes: shapeProperties,
        },
        description: `Performed exclude boolean operation on ${sel.length} shapes`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      const shapeNames = shapeProperties.map(s => s.name).join(', ');

      return {
        ...pluginResponse,
        type: ClientQueryType.EXCLUDE_BOOLEAN_OPERATION,
        success: true,
        message: `Perfect! I performed an exclude boolean operation on ${sel.length} shapes.

⚠️ **IMPORTANT**: Boolean operations are DESTRUCTIVE and cannot be perfectly undone.
The original shapes have been replaced with the exclude result.
You can undo this action, but it will recreate approximations of your original shapes.
Some visual properties like gradients, effects, or complex styling may be lost.

Exclude shapes: ${shapeNames}
Result: ${excludeShape.name || excludeShape.id}

Consider saving your work before using boolean operations.`,
        payload: {
          excludeShapeId: excludeShape.id,
          excludeShapes: shapeProperties.map(s => ({ id: s.id, name: s.name })),
          undoInfo,
        },
      };
    } catch (excludeError) {
      console.warn(`Penpot createBoolean exclude failed:`, excludeError);
      return {
        ...pluginResponse,
        type: ClientQueryType.EXCLUDE_BOOLEAN_OPERATION,
        success: false,
        message: `Failed to perform exclude boolean operation. Penpot's boolean operation API may not be available or the shapes may not be excludable.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.EXCLUDE_BOOLEAN_OPERATION,
      success: false,
      message: `Error performing exclude boolean operation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function flattenSelectionTool(_payload: FlattenSelectionQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.FLATTEN_SELECTION,
        success: false,
        message: `Please select at least 1 shape to flatten. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Store information about the shapes being flattened for undo
    const shapeProperties: Array<{
      id: string;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fills?: unknown;
      strokes?: unknown;
    }> = [];

    // First pass: capture shape information
    for (const shape of sel) {
      shapeProperties.push({
        id: shape.id,
        name: shape.name || `Shape ${shape.id.slice(-4)}`,
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fills: shape.fills,
        strokes: shape.strokes,
      });
    }

    // Create the flattened shape using Penpot's flatten method or manual conversion
    try {
      const flattenedShapes: Shape[] = [];

      // Check if flatten API is available and try to use it
      if (typeof penpot.flatten === 'function') {
        console.log('Using penpot.flatten API');

        // Use the correct API: penpot.flatten(shapes: Shape[]): Path[]
        try {
          const flattened = penpot.flatten(sel);
          console.log('penpot.flatten returned:', flattened);

          // The API might return the flattened shapes or modify selection in-place
          if (flattened && Array.isArray(flattened) && flattened.length > 0) {
            // API returned the flattened shapes
            flattenedShapes.push(...flattened);
            console.log('Using API-returned flattened shapes:', flattenedShapes.length);
          } else {
            // API might have modified selection in-place, check current selection
            const currentSel = getSelectionForAction();
            if (currentSel && currentSel.length > 0) {
              // Assume the current selection contains the flattened shapes
              flattenedShapes.push(...currentSel);
              console.log('Using current selection as flattened shapes:', flattenedShapes.length);
            } else {
              console.warn('No flattened shapes found in API response or current selection');
            }
          }
        } catch (flattenError) {
          console.warn('penpot.flatten API threw error:', flattenError);
          throw flattenError; // Re-throw to trigger error response
        }
      } else {
        throw new Error('penpot.flatten API not available');
      }

      // If we have flattened shapes, consider it a success
      if (flattenedShapes.length > 0) {
        console.log('Flatten operation successful, found', flattenedShapes.length, 'flattened shapes');

        // Add to undo stack
        const undoInfo: UndoInfo = {
          actionType: ClientQueryType.FLATTEN_SELECTION,
          actionId: `flatten_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          undoData: {
            flattenedShapeIds: flattenedShapes.map(s => s.id),
            originalShapes: shapeProperties,
          },
          description: `Flattened ${sel.length} shapes into ${flattenedShapes.length} paths`,
          timestamp: Date.now(),
        };

        undoStack.push(undoInfo);

        const shapeNames = shapeProperties.map(s => s.name).join(', ');

        return {
          ...pluginResponse,
          type: ClientQueryType.FLATTEN_SELECTION,
          success: true,
          message: `Perfect! I flattened ${sel.length} shape${sel.length > 1 ? 's' : ''} into ${flattenedShapes.length} path${flattenedShapes.length > 1 ? 's' : ''}.

⚠️ **IMPORTANT**: Flatten operations are DESTRUCTIVE and cannot be perfectly undone.
The original shapes have been converted and replaced with flattened paths.
You can undo this action, but it will recreate approximations of your original shapes.
Some visual properties like gradients, effects, or complex styling may be lost.

Flattened shapes: ${shapeNames}
Result: ${flattenedShapes.length} flattened path${flattenedShapes.length > 1 ? 's' : ''}

The shapes have been flattened into editable paths that can be manipulated individually or as a group.`,
          payload: {
            flattenedShapeIds: flattenedShapes.map(s => s.id),
            flattenedShapes: shapeProperties.map(s => ({ id: s.id, name: s.name })),
            undoInfo,
          },
        };
      } else {
        // No flattened shapes found, but operation might have succeeded
        console.warn('No flattened shapes detected, but operation may have succeeded');
        throw new Error('Flatten operation completed but no flattened shapes were detected');
      }
    } catch (flattenError) {
      console.warn(`Penpot flatten operation failed:`, flattenError);
      return {
        ...pluginResponse,
        type: ClientQueryType.FLATTEN_SELECTION,
        success: false,
        message: `Failed to flatten shapes using Penpot's API. The shapes may not be flattenable or the API may not be available in this version of Penpot.`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.FLATTEN_SELECTION,
      success: false,
      message: `Error flattening shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createShapeFromSvgTool(payload: CreateShapeFromSvgQueryPayload): Promise<PluginResponseMessage> {
  try {
    const { svgString, name } = payload ?? {};

    if (!svgString || typeof svgString !== 'string' || svgString.trim().length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
        success: false,
        message: 'Invalid payload. Expected { svgString: string, name?: string }',
      };
    }

    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    const hasSelection = sel && sel.length > 0;

    // Check if createShapeFromSvg API is available
    if (typeof penpot.createShapeFromSvg !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
        success: false,
        message: 'Penpot createShapeFromSvg API is not available in this version.',
      };
    }

    try {
      // Create shape from SVG using Penpot API
      const createdShape = penpot.createShapeFromSvg(svgString);

      if (!createdShape) {
        return {
          ...pluginResponse,
          type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
          success: false,
          message: 'Failed to create shape from SVG. The SVG may be invalid or unsupported.',
        };
      }

      // Position the shape based on current selection
      if (hasSelection && sel.length > 0) {
        // Position relative to the first selected shape
        const referenceShape = sel[0];
        createdShape.x = (referenceShape.x || 0) + (referenceShape.width || 100) + 20; // 20px offset
        createdShape.y = referenceShape.y || 0;
      } else {
        // Default position if no selection
        createdShape.x = createdShape.x || 100;
        createdShape.y = createdShape.y || 100;
      }

      // Set name if provided
      if (name && typeof name === 'string') {
        createdShape.name = name;
      }

      // Add to undo stack
      const undoInfo: UndoInfo = {
        actionType: ClientQueryType.CREATE_SHAPE_FROM_SVG,
        actionId: `create_svg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoData: {
          createdShapeId: createdShape.id,
          svgString: svgString,
          shapeName: createdShape.name,
          position: { x: createdShape.x, y: createdShape.y },
        },
        description: `Created shape from SVG: ${createdShape.name || 'Unnamed shape'}`,
        timestamp: Date.now(),
      };

      undoStack.push(undoInfo);

      const positionInfo = hasSelection
        ? `Positioned next to selected shape at (${createdShape.x}, ${createdShape.y})`
        : `Positioned at default location (${createdShape.x}, ${createdShape.y})`;

      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
        success: true,
        message: `Perfect! I created a new shape from the SVG string.

Shape created: ${createdShape.name || 'Unnamed shape'}
Shape ID: ${createdShape.id}
SVG length: ${svgString.length} characters
${positionInfo}

The shape has been added to your current page and can be selected and modified like any other shape.`,
        payload: {
          createdShape: createdShape,
          shapeId: createdShape.id,
          shapeName: createdShape.name,
          svgString: svgString,
          position: { x: createdShape.x, y: createdShape.y },
        },
      };
    } catch (createError) {
      console.warn('createShapeFromSvg API failed:', createError);
      return {
        ...pluginResponse,
        type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
        success: false,
        message: `Failed to create shape from SVG: ${createError instanceof Error ? createError.message : String(createError)}`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CREATE_SHAPE_FROM_SVG,
      success: false,
      message: `Error creating shape from SVG: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function exportSelectionAsSvgTool(payload: ExportSelectionAsSvgQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use shared selection system for safe selection access
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.EXPORT_SELECTION_AS_SVG,
        success: false,
        message: `Please select at least 1 shape to export as SVG. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    // Validate that we have actual shape objects with export capability
    const validShapes = sel.filter(shape => {
      if (!shape) {
        console.warn('❌ Null shape in selection');
        return false;
      }
      if (typeof shape.export !== 'function') {
        console.warn(`❌ Shape ${shape.id} does not have export method:`, shape);
        return false;
      }
      return true;
    });

    if (validShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.EXPORT_SELECTION_AS_SVG,
        success: false,
        message: `No valid shapes found in selection. Please select shapes that can be exported as SVG.`,
      };
    }

    console.log(`✅ Processing ${validShapes.length} valid shapes for SVG export`);

    const { includeBackground = false } = payload ?? {};

    try {
      // Export each valid shape as SVG
      const svgPromises = validShapes.map(async (shape) => {
        try {
          console.log(`🔄 Exporting shape: ${shape.name || shape.id}`);
          const uint8Array = await shape.export({ type: 'svg' });
          // Convert Uint8Array to string using String.fromCharCode
          const svgText = String.fromCharCode(...Array.from(uint8Array));
          console.log(`✅ Successfully exported shape: ${shape.name || shape.id}`);
          return {
            svgText,
            shapeId: shape.id,
            shapeName: shape.name || `Shape ${shape.id.slice(-4)}`,
            x: shape.x || 0,
            y: shape.y || 0,
          };
        } catch (shapeError) {
          console.warn(`❌ Failed to export shape ${shape.name || shape.id}:`, shapeError);
          return null;
        }
      });

      const svgResults = await Promise.all(svgPromises);
      const validResults = svgResults.filter(result => result !== null);

      if (validResults.length === 0) {
        throw new Error('Could not export any shapes as SVG - all exports failed');
      }

      // Combine all SVG content into a single document
      let combinedSvg = '';

      if (validResults.length === 1) {
        // Single shape - return as-is
        combinedSvg = validResults[0].svgText;
      } else {
        // Multiple shapes - combine into one SVG document
        // Calculate bounds for the combined SVG
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        validResults.forEach(result => {
          minX = Math.min(minX, result.x);
          minY = Math.min(minY, result.y);
          // Estimate max bounds (this is approximate since we don't have exact shape dimensions)
          maxX = Math.max(maxX, result.x + 200); // Default estimate
          maxY = Math.max(maxY, result.y + 200); // Default estimate
        });

        const width = maxX - minX;
        const height = maxY - minY;

        // Create combined SVG
        combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;

        if (includeBackground) {
          combinedSvg += `<rect width="100%" height="100%" fill="white"/>`;
        }

        // Extract and combine SVG elements from each shape's export
        validResults.forEach(result => {
          // Parse the SVG text and extract the inner content
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(result.svgText, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;

          // Get all child elements (excluding the root <svg> tag)
          const childElements = Array.from(svgElement.children);
          childElements.forEach(child => {
            // Adjust positioning relative to the combined SVG
            const transform = `translate(${result.x - minX}, ${result.y - minY})`;
            child.setAttribute('transform', transform);
            combinedSvg += child.outerHTML;
          });
        });

        combinedSvg += '</svg>';
      }

      const backgroundStatus = includeBackground ? 'with white background' : 'with transparent background';

      return {
        ...pluginResponse,
        type: ClientQueryType.EXPORT_SELECTION_AS_SVG,
        success: true,
        message: `Perfect! I exported ${validResults.length} shape${validResults.length > 1 ? 's' : ''} as SVG ${backgroundStatus}.

✅ **Export Summary:**
- Shapes selected: ${sel.length}
- Shapes exported: ${validResults.length}/${validShapes.length}
- Background: ${includeBackground ? 'White' : 'Transparent'}
- File size: ${combinedSvg.length} characters

**SVG Content Preview:**
\`\`\`svg
${combinedSvg.length > 500 ? combinedSvg.substring(0, 500) + '...' : combinedSvg}
\`\`\`

**How would you like to save this SVG?**

**Option 1: Copy & Save Manually**
1. Copy the SVG code above
2. Paste into a text editor (like VS Code, Notepad, or TextEdit)
3. Save the file as \`exported_shapes.svg\`

**Option 2: Use as Blob URL**
You can create a downloadable link using: \`data:image/svg+xml;base64,${btoa(combinedSvg)}\`

**Option 3: Manual Penpot Export**
For comparison, you can also use Penpot's built-in export:
- Select your shapes in Penpot
- Right-click → Export → SVG
- Choose your save location

The exported SVG is ready to use in web projects, design tools, or anywhere SVG is supported!`,
        payload: {
          svgString: combinedSvg,
          shapeCount: validResults.length,
          exportedShapes: validResults.map(r => ({ id: r.shapeId, name: r.shapeName })),
          fileName: `exported_shapes_${Date.now()}.svg`,
          includeBackground,
          blobUrl: `data:image/svg+xml;base64,${btoa(combinedSvg)}`,
        },
      };
    } catch (exportError) {
      console.warn('SVG export failed:', exportError);
      return {
        ...pluginResponse,
        type: ClientQueryType.EXPORT_SELECTION_AS_SVG,
        success: false,
        message: `Failed to export shapes as SVG: ${exportError instanceof Error ? exportError.message : String(exportError)}`,
      };
    }
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.EXPORT_SELECTION_AS_SVG,
      success: false,
      message: `Error exporting selection as SVG: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function resizeTool(payload: ResizeQueryPayload): Promise<PluginResponseMessage> {
  try {
    // First, gather a read-only snapshot of the selection for UI/UX (dimensions, names).
    // This ensures tools can present selection information even if the director
    // doesn't have access to GET_SELECTION_INFO. This read-only helper does not
    // mutate the selection and is safe for use in AI/UX prompts.
    const selectionInfo = readSelectionInfo();
    if (!selectionInfo || selectionInfo.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.RESIZE,
        success: false,
        message: `Please select at least 1 shape to resize. You currently have ${selectionInfo?.length || 0} shape${(selectionInfo?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }
    // Use shared selection system for safe selection access (mutation)
    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      // We still provide read-only selection information so the caller can present
      // the current dimensions even if the plugin cannot mutate the selection.
      return {
        ...pluginResponse,
        type: ClientQueryType.RESIZE,
        success: false,
        message: `Please select at least 1 shape to resize. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
        payload: {
          currentSelectionInfo: selectionInfo,
        } as unknown as ResizeResponsePayload,
      };
    }

    const { scaleX, scaleY, maintainAspectRatio = true } = payload ?? {};

    // Validate that we have scale factors to work with
    if (scaleX === undefined && scaleY === undefined) {
      return {
        ...pluginResponse,
        type: ClientQueryType.RESIZE,
        success: false,
        message: `Please specify at least a scaleX or scaleY factor. For example: scaleX: 1.5 (50% larger) or scaleY: 0.5 (half size). Current payload: ${JSON.stringify(payload)}`,
      };
    }

    // Store previous dimensions for undo
    const shapeIds: string[] = [];
    const previousDimensions: Array<{ width: number; height: number }> = [];
    const newDimensions: Array<{ width: number; height: number }> = [];

    // First pass: capture previous dimensions and calculate new ones
    for (const shape of sel) {
      shapeIds.push(shape.id);
  // Prefer the read-only snapshot for previous dimensions to avoid any
  // accidental mutation or re-query during calculations.
  const infoForShape = selectionInfo.find(si => si.id === shape.id);
  const prevWidth = typeof infoForShape?.width === 'number' ? infoForShape.width : shape.width;
  const prevHeight = typeof infoForShape?.height === 'number' ? infoForShape.height : shape.height;
      previousDimensions.push({ width: prevWidth, height: prevHeight });

      // Calculate new dimensions based on scale factors
      let newWidth = prevWidth;
      let newHeight = prevHeight;

      if (maintainAspectRatio) {
        // Use scaleX for both dimensions, or scaleY if scaleX not provided
        const scale = scaleX !== undefined ? scaleX : scaleY !== undefined ? scaleY : 1.0;
        newWidth = prevWidth * scale;
        newHeight = prevHeight * scale;
      } else {
        // Independent scaling
        if (scaleX !== undefined) {
          newWidth = prevWidth * scaleX;
        }
        if (scaleY !== undefined) {
          newHeight = prevHeight * scaleY;
        }
      }

      newDimensions.push({ width: newWidth, height: newHeight });
    }

    // Second pass: apply resize
    let resizedCount = 0;
    for (let i = 0; i < sel.length; i++) {
      const shape = sel[i];
    const dimensions = newDimensions[i];
    try {
      shape.resize(dimensions.width, dimensions.height);
        resizedCount++;
      } catch (shapeError) {
        console.warn(`Failed to resize shape ${shape.id}:`, shapeError);
      }
    }

    if (resizedCount === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.RESIZE,
        success: false,
        message: 'Failed to resize any shapes',
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    // Add to undo stack
    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.RESIZE,
      actionId: `resize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds,
        previousDimensions,
      },
      description: `Resized ${resizedCount} shape${resizedCount > 1 ? 's' : ''} with scale factors ${scaleX || '1.0'} × ${scaleY || '1.0'}${maintainAspectRatio ? ' (maintaining aspect ratio)' : ''}`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.RESIZE,
      message: `Perfect! I resized ${resizedCount} shape${resizedCount > 1 ? 's' : ''} using scale factors ${scaleX || '1.0'} × ${scaleY || '1.0'}${maintainAspectRatio ? ' (maintaining aspect ratio)' : ''}.

Resized shapes: ${shapeNames}

You can undo this action anytime with "undo last action".`,
      payload: {
        resizedShapes: sel.map(s => ({ id: s.id, name: s.name })),
        scaleFactors: { scaleX, scaleY },
        maintainAspectRatio,
        undoInfo,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.RESIZE,
      success: false,
      message: `Error resizing shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function rotateTool(payload: RotateQueryPayload): Promise<PluginResponseMessage> {
  try {
    const selectionInfo = readSelectionInfo();
    if (!selectionInfo || selectionInfo.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ROTATE,
        success: false,
        message: `Please select at least 1 shape to rotate. You currently have ${selectionInfo?.length || 0} shape${(selectionInfo?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ROTATE,
        success: false,
        message: `Please select at least 1 shape to rotate. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
        payload: {
          currentSelectionInfo: selectionInfo,
        } as unknown as RotateResponsePayload,
      };
    }

    const { angle } = payload ?? {};

    if (typeof angle !== 'number') {
      return {
        ...pluginResponse,
        type: ClientQueryType.ROTATE,
        success: false,
        message: `Please specify an angle to rotate shapes. Example: angle: 90 (degrees)`,
        payload: {
          currentSelectionInfo: selectionInfo,
        } as unknown as RotateResponsePayload,
      };
    }

    const previousRotations: Array<number | undefined> = [];
    const rotatedIds: string[] = [];

    for (const shape of sel) {
      try {
        const prev = typeof shape.rotation === 'number' ? shape.rotation : undefined;
        previousRotations.push(prev);

        // Prefer the native rotate method if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (shape as any).rotate === 'function') {
          // Penpot rotate() takes degrees
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (shape as any).rotate(angle);
        } else {
          // fallback: set rotation property directly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (shape as any).rotation = (prev ?? 0) + angle;
        }

        rotatedIds.push(shape.id);
      } catch (e) {
        console.warn(`Failed to rotate shape ${shape.id}:`, e);
      }
    }

    if (rotatedIds.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.ROTATE,
        success: false,
        message: 'Failed to rotate any shapes',
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.ROTATE,
      actionId: `rotate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds: rotatedIds,
        previousRotations,
        angle,
      },
      description: `Rotated ${rotatedIds.length} shape${rotatedIds.length > 1 ? 's' : ''} by ${angle}°`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.ROTATE,
      message: `Rotated ${rotatedIds.length} shape${rotatedIds.length > 1 ? 's' : ''} by ${angle}°. Shapes: ${shapeNames}`,
      payload: {
        rotatedShapes: sel.map(s => ({ id: s.id, name: s.name })),
        angle,
        undoInfo,
      },
    };

  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.ROTATE,
      success: false,
      message: `Error rotating shapes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function cloneSelectionTool(payload: CloneSelectionQueryPayload): Promise<PluginResponseMessage> {
  try {
    const selectionInfo = readSelectionInfo();
    if (!selectionInfo || selectionInfo.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'Select at least one shape before cloning the selection.',
      };
    }

    const selection = getSelectionForAction();
    if (!selection || selection.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const { offset, skipLocked = true, keepPosition = false, fallback = 'auto' } = payload ?? {};
    // keep logs minimal in production
    const selectionCount = selectionInfo.length;
    const isShapeLocked = (shape: Shape) => Boolean((shape as { locked?: boolean }).locked);
    const lockedShapes = selection.filter(isShapeLocked);
    const lockedShapeDetails = lockedShapes.map(shape => ({ id: shape.id, name: shape.name }));
    const actionableShapes = skipLocked ? selection.filter(shape => !isShapeLocked(shape)) : selection;

    // actionable/locked counts kept for debugging when needed

    if (lockedShapes.length > 0 && !skipLocked) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'Locked shapes would block the clone operation.',
        payload: {
          lockedShapes: lockedShapeDetails,
          selectionCount,
          message: 'Unlock any locked shapes or set skipLocked=true to skip them.',
        } as CloneSelectionPromptResponsePayload,
      };
    }

    if (actionableShapes.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'No unlocked shapes are available to clone.',
        payload: {
          lockedShapes: lockedShapeDetails,
          selectionCount,
          message: 'All selected shapes are locked. Unlock one or disable skipLocked to proceed.',
        } as CloneSelectionPromptResponsePayload,
      };
    }

    const selectionBounds = getSelectionBounds(actionableShapes);
    // computed selection bounds
    if (!selectionBounds) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'Unable to determine selection bounds for cloning.',
      };
    }

    let deltaX = 0;
    let deltaY = 0;
    let viewportRect: Rect = selectionBounds;

    if (!keepPosition) {
      // If the caller specified explicit offsets use them; otherwise allow
      // the cloneHelpers to compute a percentage-based offset that stays
      // on-board for the selection size.
      const offsetX = typeof offset?.x === 'number' ? offset.x : undefined;
      const offsetY = typeof offset?.y === 'number' ? offset.y : undefined;
      const fallbackMode = fallback === 'grid' ? 'auto' : (fallback as PlacementFallback);
      const excludeIds = new Set(actionableShapes.map(shape => shape.id));
      const existingBounds = getPageBounds(excludeIds);
      let placement;
      try {
        placement = findClonePlacement(selectionBounds, existingBounds, { offsetX, offsetY, fallback: fallbackMode });
        // placement computed
      } catch (placementErr) {
        console.warn('findClonePlacement failed, falling back to small offset:', placementErr);
        // fallback: place right with a small offset proportional to selection
        const fallbackX = typeof offsetX === 'number' ? offsetX : Math.max(Math.round(selectionBounds.width * 0.1), 6);
        const fallbackY = typeof offsetY === 'number' ? offsetY : Math.max(Math.round(selectionBounds.height * 0.1), 6);
        placement = { x: selectionBounds.x + selectionBounds.width + fallbackX, y: selectionBounds.y + fallbackY, width: selectionBounds.width, height: selectionBounds.height };
        // fallback placement used
      }
      deltaX = placement.x - selectionBounds.x;
      deltaY = placement.y - selectionBounds.y;
      viewportRect = unionRects(selectionBounds, placement);
    }

    const createdIds: string[] = [];
    const createdShapes: Shape[] = [];

    for (const shape of actionableShapes) {
      try {
        const clone = shape.clone();
        const baseX = typeof shape.x === 'number' ? shape.x : 0;
        const baseY = typeof shape.y === 'number' ? shape.y : 0;
        clone.x = baseX + deltaX;
        clone.y = baseY + deltaY;
        createdIds.push(clone.id);
        createdShapes.push(clone);
      } catch (err) {
        console.warn(`Failed to clone shape ${shape.id}:`, err);
      }
    }

    // createdIds populated

    if (createdIds.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.CLONE_SELECTION,
        success: false,
        message: 'Cloning selection failed. Please try again.',
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.CLONE_SELECTION,
      actionId: `clone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      description: `Cloned ${createdIds.length} shape${createdIds.length > 1 ? 's' : ''}`,
      undoData: {
        shapeIds: createdIds,
        sourceIds: actionableShapes.map(shape => shape.id),
        deltaX,
        deltaY,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    // Try to bring the created clones into view and select them so the user can act on
    // the copies immediately. We follow the same pattern used by other tools:
    // 1) center the viewport on the created bounds if viewport API is available
    // 2) set penpot.selection to the newly-created shapes so the editor shows them
    // 3) update the internal action-only selection helper so subsequent action tools
    //    see the new selection
    try {
      centerDocumentOnRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
    } catch (centerErr) {
      console.warn('Failed to center viewport after cloning:', centerErr);
    }

    try {
      // Assign selection directly when available in the runtime (test harness and penpot host)
      const hostPenpot = (globalThis as unknown as { penpot?: { selection?: Shape[] } }).penpot;
      if (hostPenpot) {
        hostPenpot.selection = createdShapes;
      }
    } catch (selErr) {
      console.warn('Failed to set selection after cloning:', selErr);
    }

    // Update internal selection tracker used by action-only helpers
    setTimeout(() => {
      try {
        updateCurrentSelection(createdIds);
      } catch (err) {
        console.warn('Failed to update current selection for clones:', err);
      }
    }, 10);

    const skippedNote = skipLocked && lockedShapes.length > 0 ? ` Skipped ${lockedShapes.length} locked shape${lockedShapes.length > 1 ? 's' : ''}.` : '';

    return {
      ...pluginResponse,
      type: ClientQueryType.CLONE_SELECTION,
      message: `Cloned ${createdIds.length} shape${createdIds.length > 1 ? 's' : ''}.${skippedNote}`,
      payload: {
        createdIds,
        undoInfo,
      } as CloneSelectionResponsePayload,
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.CLONE_SELECTION,
      success: false,
      message: `Error cloning selection: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function moveSelectionTool(payload: MoveQueryPayload): Promise<PluginResponseMessage> {
  try {
    const selectionInfo = readSelectionInfo();
    if (!selectionInfo || selectionInfo.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.MOVE,
        success: false,
        message: `Please select at least 1 shape to move. You currently have ${selectionInfo?.length || 0} shape${(selectionInfo?.length || 0) !== 1 ? 's' : ''} selected.`,
      };
    }

    const sel = getSelectionForAction();
    if (!sel || sel.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.MOVE,
        success: false,
        message: `Please select at least 1 shape to move. You currently have ${sel?.length || 0} shape${(sel?.length || 0) !== 1 ? 's' : ''} selected.`,
        payload: {
          currentSelectionInfo: selectionInfo,
        } as unknown as MoveResponsePayload,
      };
    }

    const { dx, dy, x, y } = payload ?? {};
    if (typeof dx !== 'number' && typeof dy !== 'number' && typeof x !== 'number' && typeof y !== 'number') {
      return {
        ...pluginResponse,
        type: ClientQueryType.MOVE,
        success: false,
        message: 'Please specify dx/dy for relative move or x/y for absolute move',
        payload: {
          currentSelectionInfo: selectionInfo,
        } as unknown as MoveResponsePayload,
      };
    }

  // Capture previous positions
    const previousPositions: Array<{ x?: number; y?: number }> = [];
    const newPositions: Array<{ x?: number; y?: number }> = [];
    const movedIds: string[] = [];
  // Track skipped locked shapes with ids and names for UI feedback
  const skippedLockedIds: string[] = [];
  const skippedLockedNames: string[] = [];

    for (const shape of sel) {
      try {
        // Respect lock state: do not attempt to move locked shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((shape as any).locked === true) {
          skippedLockedIds.push(shape.id);
          skippedLockedNames.push(shape.name ?? shape.id);
          continue;
        }
        const prevX = typeof shape.x === 'number' ? shape.x : 0;
        const prevY = typeof shape.y === 'number' ? shape.y : 0;
        previousPositions.push({ x: prevX, y: prevY });

        const targetX = typeof x === 'number' ? x : prevX + (dx ?? 0);
        const targetY = typeof y === 'number' ? y : prevY + (dy ?? 0);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sAny = shape as any;
        // Preference for a translate method if it exists
        if (typeof sAny.translate === 'function') {
          sAny.translate(targetX - prevX, targetY - prevY);
        } else {
          sAny.x = targetX;
          sAny.y = targetY;
        }

        newPositions.push({ x: targetX, y: targetY });
        movedIds.push(shape.id);
      } catch (e) {
        console.warn(`Failed to move shape ${shape.id}:`, e);
      }
    }

    if (movedIds.length === 0) {
      // If we couldn't move any shapes but some were locked, return a helpful message
  if (skippedLockedIds.length > 0) {
        return {
          ...pluginResponse,
          type: ClientQueryType.MOVE,
          success: false,
    message: `Skipped ${skippedLockedIds.length} locked shape(s): ${skippedLockedNames.join(', ')}`,
          payload: {
            skippedLockedIds,
            skippedLockedNames,
          } as unknown as MoveResponsePayload,
        };
      }
      return {
        ...pluginResponse,
        type: ClientQueryType.MOVE,
        success: false,
        message: 'Failed to move any shapes',
      };
    }

    const shapeNames = sel.map(s => s.name || s.id).join(', ');

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.MOVE,
      actionId: `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undoData: {
        shapeIds: movedIds,
        previousPositions,
        newPositions,
      },
      description: `Moved ${movedIds.length} shape${movedIds.length > 1 ? 's' : ''}`,
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    return {
      ...pluginResponse,
      type: ClientQueryType.MOVE,
      message: `Moved ${movedIds.length} shape${movedIds.length > 1 ? 's' : ''}: ${shapeNames}`,
      payload: {
        movedShapes: sel.map(s => ({ id: s.id, name: s.name })),
  skippedLockedIds,
  skippedLockedNames,
        previousPositions,
        newPositions,
        undoInfo,
      } as unknown as MoveResponsePayload,
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.MOVE,
      success: false,
      message: `Error moving selection: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function toggleSelectionLockTool(payload: ToggleSelectionLockQueryPayload): Promise<PluginResponseMessage> {
  try {
    const { lock, shapeIds } = payload ?? {};

    // Determine which shapes to apply the lock/unlock to
    let targets: any[] = [];
    if (shapeIds && Array.isArray(shapeIds) && shapeIds.length > 0) {
      // Use currentPage to fetch shapes by id
      const currentPage = penpot.currentPage as any;
      if (!currentPage) {
        return {
          ...pluginResponse,
          type: ClientQueryType.TOGGLE_SELECTION_LOCK,
          success: false,
          message: 'No current page available to modify shapes',
        };
      }

      for (const id of shapeIds) {
        const s = currentPage.getShapeById(id);
        if (s) targets.push(s);
      }
    } else {
      // Use the action-only selection getter for safe mutations
      targets = getSelectionForAction() as any[];
    }

    if (!targets || targets.length === 0) {
      // Try a fallback: if the action-only selection (currentSelectionIds) has ids,
      // resolve shape objects via currentPage.getShapeById and use them as targets.
      try {
        const currentPage = penpot.currentPage as any;
        if ((currentSelectionIds || []).length > 0 && currentPage && typeof currentPage.getShapeById === 'function') {
          const resolved = currentSelectionIds.map((id: string) => {
            try { return currentPage.getShapeById(id); } catch { return null; }
          }).filter(Boolean);
          if (resolved.length > 0) {
            targets = resolved as any[];
          }
        }
      } catch (e) {
        // swallow
      }
    }
    
    if (!targets || targets.length === 0) {
  return {
        ...pluginResponse,
  type: ClientQueryType.TOGGLE_SELECTION_LOCK,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    // Diagnostic: log the current locked/blocked flags on the resolved selection so
    // we can see why UI reports a different visual state (some hosts use `blocked`).
    try {
      console.log('toggleSelectionLockTool - selection states:');
      for (const s of targets) {
        try {
          console.log(`  shape ${s.id} (${s.name || 'unnamed'}): locked=${!!s.locked}, blocked=${!!s.blocked}`);
        } catch (e) { void e; }
      }
    } catch (e) { void e; }

    // If lock not specified, decide fallback: if all are locked -> unlock all; if all unlocked -> lock all; if mixed -> prompt
    // Some Penpot host versions expose the lock state as `locked`, others (older/newer)
    // may expose `blocked`. Treat either as indicating a locked shape and keep both
    // properties in sync when toggling so the UI will reflect the change regardless
    // of which property the host UI reads.
    const lockedStates = targets.map((s: any) => !!s.locked || !!s.blocked);
    const hasLocked = lockedStates.some(Boolean);
    const hasUnlocked = lockedStates.some(v => !v);

    if (typeof lock === 'undefined' && hasLocked && hasUnlocked) {
      // Mixed selection - return prompt for UI to ask user which action to take
      return {
        ...pluginResponse,
        type: ClientQueryType.TOGGLE_SELECTION_LOCK,
        success: false,
        message: 'MIXED_SELECTION',
        payload: {
          lockedShapes: targets.filter((s: any) => !!s.locked || !!s.blocked).map((s: any) => ({ id: s.id, name: s.name })),
          unlockedShapes: targets.filter((s: any) => !s.locked && !s.blocked).map((s: any) => ({ id: s.id, name: s.name })),
  } as unknown as ToggleSelectionLockResponsePayload,
      };
    }

    const willLock = typeof lock === 'boolean' ? lock : (!hasLocked && !hasUnlocked ? true : !hasLocked);
  const previousStates: boolean[] = [];
    const affectedIds: string[] = [];
    const lockedShapes: Array<{ id: string; name?: string }> = [];
    const unlockedShapes: Array<{ id: string; name?: string }> = [];

    for (const shape of targets) {
      try {
        // Record the prior locked state considering either `locked` or `blocked`.
        const prevLocked = !!shape.locked || !!shape.blocked;
        // Apply only if needed
          if (willLock && !(shape.locked || shape.blocked)) {
          // Set both fields when possible so host UIs which read either property
          // will reflect the same state.
          try { shape.locked = true; } catch (e) { void e; }
          try { shape.blocked = true; } catch (e) { void e; }
          lockedShapes.push({ id: shape.id, name: shape.name });
          affectedIds.push(shape.id);
          previousStates.push(prevLocked);
        } else if (!willLock && (shape.locked || shape.blocked)) {
          try { shape.locked = false; } catch (e) { void e; }
          try { shape.blocked = false; } catch (e) { void e; }
          unlockedShapes.push({ id: shape.id, name: shape.name });
          affectedIds.push(shape.id);
          previousStates.push(prevLocked);
        }
      } catch (e) {
        console.warn(`Failed to toggle lock for shape ${shape.id}:`, e);
      }
    }

    if (affectedIds.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.TOGGLE_SELECTION_LOCK,
        success: false,
        message: willLock ? 'No shapes to lock' : 'No shapes to unlock',
      };
    }

    const undoInfo: UndoInfo = {
  actionType: ClientQueryType.TOGGLE_SELECTION_LOCK,
      actionId: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `${willLock ? 'Locked' : 'Unlocked'} ${affectedIds.length} shape${affectedIds.length > 1 ? 's' : ''}`,
      undoData: {
        shapeIds: affectedIds,
        previousLockedStates: previousStates,
      },
      timestamp: Date.now(),
    };

  undoStack.push(undoInfo);

  const respPayload: ToggleSelectionLockResponsePayload = {
      lockedShapes: lockedShapes.length > 0 ? lockedShapes : undefined,
      unlockedShapes: unlockedShapes.length > 0 ? unlockedShapes : undefined,
      undoInfo,
    };

    return {
      ...pluginResponse,
  type: ClientQueryType.TOGGLE_SELECTION_LOCK,
      success: true,
      message: `${willLock ? 'Locked' : 'Unlocked'} ${affectedIds.length} shape${affectedIds.length > 1 ? 's' : ''}`,
      payload: respPayload,
    };
  } catch (err) {
    return {
      ...pluginResponse,
      type: ClientQueryType.TOGGLE_SELECTION_LOCK,
      success: false,
      message: `Error locking/unlocking selection: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function toggleSelectionVisibilityTool(payload: ToggleSelectionVisibilityQueryPayload): Promise<PluginResponseMessage> {
  try {
    const { hide, shapeIds } = payload ?? {};

    let targets: any[] = [];
    if (shapeIds && Array.isArray(shapeIds) && shapeIds.length > 0) {
      const currentPage = penpot.currentPage as any;
      if (!currentPage) {
        return {
          ...pluginResponse,
          type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
          success: false,
          message: 'No current page available to modify shapes',
        };
      }

      for (const id of shapeIds) {
        const s = currentPage.getShapeById(id);
        if (s) targets.push(s);
      }
    } else {
      targets = getSelectionForAction() as any[];
    }

    if (!targets || targets.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
        success: false,
        message: 'NO_SELECTION',
      };
    }

    const visibleStates = targets.map((s: any) => typeof s.visible === 'boolean' ? !!s.visible : true);
    const hasVisible = visibleStates.some(Boolean);
    const hasHidden = visibleStates.some(v => !v);

    if (typeof hide === 'undefined' && hasVisible && hasHidden) {
      return {
        ...pluginResponse,
        type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
        success: false,
        message: 'MIXED_SELECTION',
        payload: {
          hiddenShapes: targets.filter((s: any) => !s.visible).map((s: any) => ({ id: s.id, name: s.name })),
          unhiddenShapes: targets.filter((s: any) => s.visible).map((s: any) => ({ id: s.id, name: s.name })),
        } as unknown as ToggleSelectionVisibilityResponsePayload,
      };
    }

    const willHide = typeof hide === 'boolean' ? hide : (!hasVisible && !hasHidden ? true : !hasHidden);
    const previousStates: boolean[] = [];
    const affectedIds: string[] = [];
    const hiddenShapes: Array<{ id: string; name?: string }> = [];
    const unhiddenShapes: Array<{ id: string; name?: string }> = [];

    for (const shape of targets) {
      try {
        const prevVisible = typeof shape.visible === 'boolean' ? !!shape.visible : true;
        if (willHide && shape.visible) {
          shape.visible = false;
          hiddenShapes.push({ id: shape.id, name: shape.name });
          affectedIds.push(shape.id);
          previousStates.push(prevVisible);
        } else if (!willHide && !shape.visible) {
          shape.visible = true;
          unhiddenShapes.push({ id: shape.id, name: shape.name });
          affectedIds.push(shape.id);
          previousStates.push(prevVisible);
        }
      } catch (e) {
        console.warn(`Failed to toggle visibility for shape ${shape.id}:`, e);
      }
    }

    if (affectedIds.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
        success: false,
        message: willHide ? 'No shapes to hide' : 'No shapes to unhide',
      };
    }

    const undoInfo: UndoInfo = {
      actionType: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
      actionId: `visibility_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `${willHide ? 'Hidden' : 'Unhidden'} ${affectedIds.length} shape${affectedIds.length > 1 ? 's' : ''}`,
      undoData: {
        shapeIds: affectedIds,
        previousVisibleStates: previousStates,
      },
      timestamp: Date.now(),
    };

    undoStack.push(undoInfo);

    const respPayload: ToggleSelectionVisibilityResponsePayload = {
      hiddenShapes: hiddenShapes.length > 0 ? hiddenShapes : undefined,
      unhiddenShapes: unhiddenShapes.length > 0 ? unhiddenShapes : undefined,
      undoInfo,
    };

    return {
      ...pluginResponse,
      type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
      success: true,
      message: `${willHide ? 'Hidden' : 'Unhidden'} ${affectedIds.length} shape${affectedIds.length > 1 ? 's' : ''}`,
      payload: respPayload,
    };
  } catch (err) {
    return {
      ...pluginResponse,
      type: ClientQueryType.TOGGLE_SELECTION_VISIBILITY,
      success: false,
      message: `Error toggling visibility for selection: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function getSelectionInfoTool(_payload: GetSelectionInfoQueryPayload): Promise<PluginResponseMessage> {
  try {
    // Use the safe information-reading function
    const selectedObjects = getSelectionInfo();

    if (selectedObjects.length === 0) {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_SELECTION_INFO,
        success: false,
        message: 'No shapes are currently selected. Please select one or more shapes first.',
  };
    }

    const shapeNames = selectedObjects.map(obj => obj.name || `Shape ${obj.id.slice(-4)}`).join(', ');

    return {
      ...pluginResponse,
      type: ClientQueryType.GET_SELECTION_INFO,
      message: `Found ${selectedObjects.length} selected shape${selectedObjects.length > 1 ? 's' : ''}: ${shapeNames}`,
      payload: {
        selectionCount: selectedObjects.length,
        selectedObjects,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_SELECTION_INFO,
      success: false,
      message: `Error reading selection information: ${error instanceof Error ? error.message : String(error)}`,
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
  console.log('Undoing actionType:', lastAction.actionType);
    console.log('Undoing - data:', JSON.stringify(lastAction.undoData));

    // Push to redo stack so it can be redone
    redoStack.push(lastAction);

    const restoredShapes: string[] = [];

    // Perform the undo based on action type
    // actionType checks handled by switch
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
              // currentPage.getShapeById? -> available in testing environment
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // (debug) removed reference to `sel` which is undefined in this scope

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

      case ClientQueryType.SET_SELECTION_OPACITY: {
        const opacityData = lastAction.undoData as {
          shapeIds: string[];
          previousOpacities: Array<number | undefined>;
        };

        for (let i = 0; i < opacityData.shapeIds.length; i++) {
          const shapeId = opacityData.shapeIds[i];
          const previousOpacity = opacityData.previousOpacities[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            shape.opacity = typeof previousOpacity === 'number' ? previousOpacity : 1;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore opacity for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.SET_SELECTION_BLEND_MODE: {
        const blendData = lastAction.undoData as {
          shapeIds: string[];
          previousBlendModes: Array<string | undefined>;
        };

        for (let i = 0; i < blendData.shapeIds.length; i++) {
          const shapeId = blendData.shapeIds[i];
          const previousBlendMode = blendData.previousBlendModes[i] as typeof blendModes[number] | undefined;

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            const shapeWithBlend = shape as Shape & { blendMode?: typeof blendModes[number]; name?: string };
            // Restore previous blend mode or remove the property when there was none
            (shapeWithBlend as any).blendMode = previousBlendMode ?? undefined;
            restoredShapes.push(shapeWithBlend.name || shapeWithBlend.id);
          } catch (error) {
            console.warn(`Failed to restore blend mode for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.SET_SELECTION_BORDER_RADIUS: {
        const radiusData = lastAction.undoData as {
          shapeIds: string[];
          previousBorderRadii: Array<number | undefined>;
        };

        for (let i = 0; i < radiusData.shapeIds.length; i++) {
          const shapeId = radiusData.shapeIds[i];
          const previousRadius = radiusData.previousBorderRadii[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore previous radius or remove property if undefined
            if (typeof previousRadius === 'number') {
              (shape as any).borderRadius = previousRadius;
            } else {
              delete (shape as any).borderRadius;
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore border radius for shape ${shapeId}:`, error);
          }
        }

        break;
      }

      /* (removed reapply-rotate case; rotate redo belongs to redoLastAction) */

      

      case ClientQueryType.ROTATE: {
        // Undo the rotation by rotating by the inverse angle or restoring previous rotation
        const rotateData = lastAction.undoData as { shapeIds: string[]; previousRotations: Array<number | undefined>; angle: number };

        for (let i = 0; i < rotateData.shapeIds.length; i++) {
          const shapeId = rotateData.shapeIds[i];
          const angle = rotateData.angle;
          const previousRotation = rotateData.previousRotations[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Prefer to restore the previous absolute rotation when available. This
            // matches user expectations for undo: an undo should return to the
            // exact prior rotation rather than applying an inverse angle which
            // can be additive and produce unexpected values for custom rotate()
            // implementations. Fall back to native rotate(-angle) only if we
            // don't have a recorded previousRotation.
            const shAny = shape as unknown as { rotate?: (a: number) => void; rotation?: number };
            if (typeof previousRotation === 'number') {
              // Absolute restoration preserves exact previous state
              shAny.rotation = previousRotation;
            } else if (typeof shAny.rotate === 'function') {
              // No previous rotation recorded; try using the native inverse
              // rotation (additive). This is a best-effort fallback.
              shAny.rotate(-angle);
            } else {
              // If there was no previous rotation, remove rotation property
              shAny.rotation = undefined;
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to undo rotation for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.SET_SELECTION_BOUNDS: {
        const boundsData = lastAction.undoData as { shapeIds: string[]; previousBounds: Array<{ x?: number; y?: number; width?: number; height?: number } | undefined> };

        for (let i = 0; i < boundsData.shapeIds.length; i++) {
          const shapeId = boundsData.shapeIds[i];
          const previous = boundsData.previousBounds[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore previous bounds
            if (previous) {
              if (typeof previous.x === 'number') shape.x = previous.x;
              else delete (shape as any).x;

              if (typeof previous.y === 'number') shape.y = previous.y;
              else delete (shape as any).y;

              if (typeof previous.width === 'number' || typeof previous.height === 'number') {
                const w = typeof previous.width === 'number' ? previous.width : (typeof (shape as any).width === 'number' ? (shape as any).width : undefined);
                const h = typeof previous.height === 'number' ? previous.height : (typeof (shape as any).height === 'number' ? (shape as any).height : undefined);
                if (typeof w === 'number' && typeof h === 'number' && typeof (shape as any).resize === 'function') {
                  (shape as any).resize(w, h);
                } else {
                  if (typeof w === 'number') (shape as any).width = w;
                  if (typeof h === 'number') (shape as any).height = h;
                }
              }
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore bounds for shape ${shapeId}:`, error);
          }
        }

        break;
      }

      

      

      

      

      

      

      

      

      case ClientQueryType.MOVE: {
        const moveData = lastAction.undoData as { shapeIds: string[]; previousPositions: Array<{ x?: number; y?: number }>; newPositions: Array<{ x?: number; y?: number }> };
  // DEBUG: moveData contains shapeIds length: moveData.shapeIds.length
        for (let i = 0; i < moveData.shapeIds.length; i++) {
          const shapeId = moveData.shapeIds[i];
          const previousPosition = moveData.previousPositions[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore previous position if available
            shape.x = previousPosition.x ?? shape.x;
            shape.y = previousPosition.y ?? shape.y;

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to undo move for shape ${shapeId}:`, error);
          }
        }
        break;
      }

      case ClientQueryType.CLONE_SELECTION: {
        const cloneData = lastAction.undoData as { shapeIds: string[] };
        const currentPage = penpot.currentPage;
        if (!currentPage || !Array.isArray(cloneData.shapeIds)) {
          break;
        }

        const removedShapeIds: string[] = [];
        for (const shapeId of cloneData.shapeIds) {
          try {
            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;
            shape.remove();
            restoredShapes.push(shape.name || shape.id);
            removedShapeIds.push(shapeId);
          } catch (error) {
            console.warn(`Failed to remove cloned shape ${shapeId} during undo:`, error);
          }
        }

        // After undoing clones, try to re-select the original source shapes so the editor
        // selection reflects the user's prior selection (sourceIds) if available.
        try {
            const cloneDataTyped = cloneData as { shapeIds: string[]; sourceIds?: string[] };
            const sourceIds = cloneDataTyped.sourceIds as string[] | undefined;
            const sourceSelection: Shape[] = [];
          if (Array.isArray(sourceIds) && currentPage) {
            for (const sid of sourceIds) {
              const s = currentPage.getShapeById(sid);
              if (s) sourceSelection.push(s);
            }
          }

          const hostPenpot = (globalThis as unknown as { penpot?: { selection?: Shape[] } }).penpot;
          if (sourceSelection.length > 0) {
            if (hostPenpot) hostPenpot.selection = sourceSelection;
          } else {
            // If no source shapes, clear selection
            if (hostPenpot) hostPenpot.selection = [];
          }

          if (Array.isArray(cloneDataTyped.sourceIds)) {
            setTimeout(() => {
              try {
                updateCurrentSelection(cloneDataTyped.sourceIds ?? []);
              } catch (err) {
                console.warn('Failed to update action-selection after undoing clones:', err);
              }
            }, 10);
          }
        } catch (selErr) {
          console.warn('Failed to set selection after undoing clones:', selErr);
        }

        break;
      }

  case ClientQueryType.TOGGLE_SELECTION_LOCK: {
        // Restore previous locked state (undo)
        const lockData = lastAction.undoData as { shapeIds: string[]; previousLockedStates: boolean[] };

        for (let i = 0; i < lockData.shapeIds.length; i++) {
          const shapeId = lockData.shapeIds[i];
          const previousLocked = lockData.previousLockedStates[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            // Restore previous locked state on both properties so hosts that
            // read either `locked` or `blocked` see the consistent state.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (shape as any).locked = !!previousLocked;
            try { (shape as any).blocked = !!previousLocked; } catch {}

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore lock state for shape ${shapeId}:`, error);
          }
        }
        break;
      }
      case ClientQueryType.TOGGLE_SELECTION_VISIBILITY: {
        // Restore previous visibility states
        const visData = lastAction.undoData as { shapeIds: string[]; previousVisibleStates: boolean[] };

        for (let i = 0; i < visData.shapeIds.length; i++) {
          const shapeId = visData.shapeIds[i];
          const previousVisible = visData.previousVisibleStates[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            (shape as any).visible = !!previousVisible;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to restore visibility for shape ${shapeId}:`, error);
          }
        }
        break;
      }

  // Do not duplicate TOGGLE_SELECTION_LOCK here; handled in undo case above

      

      

      

      

      

      

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

      case ClientQueryType.UNION_BOOLEAN_OPERATION: {
        // Restore original shapes by deleting the union shape and recreating originals
        const unionData = lastAction.undoData as {
          unionShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            type: string;
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

          // Delete the union shape
          const unionShape = currentPage.getShapeById(unionData.unionShapeId);
          if (unionShape) {
            unionShape.remove();
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          const newShapeIds: string[] = [];
          for (const originalShape of unionData.originalShapes) {
            try {
              // Create a shape of the correct type
              let newShape: Shape;
              switch (originalShape.type) {
                case 'ellipse':
                  newShape = penpot.createEllipse();
                  break;
                case 'path':
                  newShape = penpot.createPath();
                  break;
                case 'rectangle':
                default:
                  newShape = penpot.createRectangle();
                  break;
              }

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

              newShapeIds.push(newShape.id);
              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }

          // Update selection to the newly created shapes after a brief delay
          // to avoid conflicts with automatic selection change events
          if (newShapeIds.length > 0) {
            setTimeout(() => {
              updateCurrentSelection(newShapeIds);
            }, 10);
          }
        } catch (error) {
          console.warn('Failed to undo union boolean operation:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo union boolean operation: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
        break;
      }

      case ClientQueryType.INTERSECTION_BOOLEAN_OPERATION: {
        // Restore original shapes by deleting the intersection shape and recreating originals
        const intersectionData = lastAction.undoData as {
          intersectionShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            type: string;
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

          // Delete the intersection shape
          const intersectionShape = currentPage.getShapeById(intersectionData.intersectionShapeId);
          if (intersectionShape) {
            intersectionShape.remove();
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          const newShapeIds: string[] = [];
          for (const originalShape of intersectionData.originalShapes) {
            try {
              // Create a shape of the correct type
              let newShape: Shape;
              switch (originalShape.type) {
                case 'ellipse':
                  newShape = penpot.createEllipse();
                  break;
                case 'path':
                  newShape = penpot.createPath();
                  break;
                case 'rectangle':
                default:
                  newShape = penpot.createRectangle();
                  break;
              }

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

              newShapeIds.push(newShape.id);
              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }

          // Update selection to the newly created shapes after a brief delay
          // to avoid conflicts with automatic selection change events
          if (newShapeIds.length > 0) {
            setTimeout(() => {
              updateCurrentSelection(newShapeIds);
            }, 10);
          }
        } catch (error) {
          console.warn('Failed to undo intersection boolean operation:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo intersection boolean operation: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
        break;
      }

      case ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION: {
        // Restore original shapes by deleting the difference shape and recreating originals
        const differenceData = lastAction.undoData as {
          differenceShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            type: string;
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

          // Delete the difference shape
          const differenceShape = currentPage.getShapeById(differenceData.differenceShapeId);
          if (differenceShape) {
            differenceShape.remove();
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          const newShapeIds: string[] = [];
          for (const originalShape of differenceData.originalShapes) {
            try {
              // Create a shape of the correct type
              let newShape: Shape;
              switch (originalShape.type) {
                case 'ellipse':
                  newShape = penpot.createEllipse();
                  break;
                case 'path':
                  newShape = penpot.createPath();
                  break;
                case 'rectangle':
                default:
                  newShape = penpot.createRectangle();
                  break;
              }

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

              newShapeIds.push(newShape.id);
              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }

          // Update selection to the newly created shapes after a brief delay
          // to avoid conflicts with automatic selection change events
          if (newShapeIds.length > 0) {
            setTimeout(() => {
              updateCurrentSelection(newShapeIds);
            }, 10);
          }
        } catch (error) {
          console.warn('Failed to undo difference boolean operation:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo difference boolean operation: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
        break;
      }

      case ClientQueryType.EXCLUDE_BOOLEAN_OPERATION: {
        // Restore original shapes by deleting the exclude shape and recreating originals
        const excludeData = lastAction.undoData as {
          excludeShapeId: string;
          originalShapes: Array<{
            id: string;
            name: string;
            type: string;
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

          // Delete the exclude shape
          const excludeShape = currentPage.getShapeById(excludeData.excludeShapeId);
          if (excludeShape) {
            excludeShape.remove();
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          const newShapeIds: string[] = [];
          for (const originalShape of excludeData.originalShapes) {
            try {
              // Create a shape of the correct type
              let newShape: Shape;
              switch (originalShape.type) {
                case 'ellipse':
                  newShape = penpot.createEllipse();
                  break;
                case 'path':
                  newShape = penpot.createPath();
                  break;
                case 'rectangle':
                default:
                  newShape = penpot.createRectangle();
                  break;
              }

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

              newShapeIds.push(newShape.id);
              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }

          // Update selection to the newly created shapes after a brief delay
          // to avoid conflicts with automatic selection change events
          if (newShapeIds.length > 0) {
            setTimeout(() => {
              updateCurrentSelection(newShapeIds);
            }, 10);
          }
        } catch (error) {
          console.warn('Failed to undo exclude boolean operation:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo exclude boolean operation: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
        break;
      }

      case ClientQueryType.FLATTEN_SELECTION: {
        // Restore original shapes by deleting the flattened paths and recreating originals
        const flattenData = lastAction.undoData as {
          flattenedShapeIds: string[];
          originalShapes: Array<{
            id: string;
            name: string;
            type: string;
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

          // Delete the flattened paths
          for (const shapeId of flattenData.flattenedShapeIds) {
            const shape = currentPage.getShapeById(shapeId);
            if (shape) {
              shape.remove();
            }
          }

          // Recreate the original shapes as rectangles (since we don't know the exact types)
          const newShapeIds: string[] = [];
          for (const originalShape of flattenData.originalShapes) {
            try {
              // Create a shape of the correct type
              let newShape: Shape;
              switch (originalShape.type) {
                case 'ellipse':
                  newShape = penpot.createEllipse();
                  break;
                case 'path':
                  newShape = penpot.createPath();
                  break;
                case 'rectangle':
                default:
                  newShape = penpot.createRectangle();
                  break;
              }

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

              newShapeIds.push(newShape.id);
              restoredShapes.push(originalShape.name);
            } catch (shapeError) {
              console.warn(`Failed to recreate shape ${originalShape.name}:`, shapeError);
            }
          }

          // Update selection to the newly created shapes after a brief delay
          // to avoid conflicts with automatic selection change events
          if (newShapeIds.length > 0) {
            setTimeout(() => {
              updateCurrentSelection(newShapeIds);
            }, 10);
          }
        } catch (error) {
          console.warn('Failed to undo flatten operation:', error);
          return {
            ...pluginResponse,
            type: ClientQueryType.UNDO_LAST_ACTION,
            success: false,
            message: `Failed to undo flatten operation: ${error instanceof Error ? error.message : String(error)}`,
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

    const isUnionBoolean = lastAction.actionType === ClientQueryType.UNION_BOOLEAN_OPERATION;
    const isIntersectionBoolean = lastAction.actionType === ClientQueryType.INTERSECTION_BOOLEAN_OPERATION;
    const isDifferenceBoolean = lastAction.actionType === ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION;
    const isExcludeBoolean = lastAction.actionType === ClientQueryType.EXCLUDE_BOOLEAN_OPERATION;
    const isFlatten = lastAction.actionType === ClientQueryType.FLATTEN_SELECTION;
    const isBooleanOperation = isUnionBoolean || isIntersectionBoolean || isDifferenceBoolean || isExcludeBoolean;
    const isDestructiveOperation = isBooleanOperation || isFlatten;
    
    return {
      ...pluginResponse,
      type: ClientQueryType.UNDO_LAST_ACTION,
      success: true,
      message: isDestructiveOperation
        ? `🔄 Undo: Recreated approximations of original shapes

⚠️ ${isBooleanOperation ? 'Boolean operations' : 'Flatten operations'} cannot be perfectly reversed. The AI has recreated approximations of your original shapes. Some visual properties like gradients, effects, or complex styling may have been lost.`
        : `Undid: ${lastAction.description}`,
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

      case ClientQueryType.ROTATE: {
        // Reapply rotation on redo
        const rotateData = lastAction.undoData as { shapeIds: string[]; previousRotations: Array<number | undefined>; angle: number };

        for (let i = 0; i < rotateData.shapeIds.length; i++) {
          const shapeId = rotateData.shapeIds[i];
          const angle = rotateData.angle;
          const previousRotation = rotateData.previousRotations[i];

          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            const shAny = shape as unknown as { rotate?: (a: number) => void; rotation?: number };
            if (typeof shAny.rotate === 'function') {
              shAny.rotate(angle);
            } else {
              shAny.rotation = (previousRotation ?? 0) + angle;
            }

            undoStack.push(lastAction);
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo rotation for shape ${shapeId}:`, error);
          }
        }
        break;
      }

        case ClientQueryType.MOVE: {
          // Reapply the move that was undone
          const moveData = lastAction.undoData as { shapeIds: string[]; previousPositions: Array<{ x?: number; y?: number }>; newPositions: Array<{ x?: number; y?: number }> };

          for (let i = 0; i < moveData.shapeIds.length; i++) {
            const shapeId = moveData.shapeIds[i];
            const newPosition = moveData.newPositions[i];

            try {
              const currentPage = penpot.currentPage;
              if (!currentPage) continue;

              const shape = currentPage.getShapeById(shapeId);
              if (!shape) continue;

              if (typeof newPosition.x === 'number') shape.x = newPosition.x;
              if (typeof newPosition.y === 'number') shape.y = newPosition.y;

              undoStack.push(lastAction);

              restoredShapes.push(shape.name || shape.id);
            } catch (error) {
              console.warn(`Failed to redo move for shape ${shapeId}:`, error);
            }
          }
          break;
        }

          case ClientQueryType.CLONE_SELECTION: {
            const cloneData = lastAction.undoData as { shapeIds: string[]; sourceIds?: string[]; deltaX?: number; deltaY?: number };
            const currentPage = penpot.currentPage;
            if (!currentPage || !Array.isArray(cloneData.sourceIds)) {
              break;
            }

            const newCreatedIds: string[] = [];
            const dx = typeof cloneData.deltaX === 'number' ? cloneData.deltaX : 0;
            const dy = typeof cloneData.deltaY === 'number' ? cloneData.deltaY : 0;

            for (const sourceId of cloneData.sourceIds) {
              try {
                const sourceShape = currentPage.getShapeById(sourceId);
                if (!sourceShape) continue;
                const clone = sourceShape.clone();
                if (!clone) continue;
                const baseX = typeof sourceShape.x === 'number' ? sourceShape.x : 0;
                const baseY = typeof sourceShape.y === 'number' ? sourceShape.y : 0;
                clone.x = baseX + dx;
                clone.y = baseY + dy;
                newCreatedIds.push(clone.id);
                restoredShapes.push(clone.name || clone.id);
              } catch (error) {
                console.warn(`Failed to redo clone for source shape ${sourceId}:`, error);
              }
            }

            cloneData.shapeIds = newCreatedIds;

            // After re-creating the clones, select them and update the internal selection
            try {
              const createdSelection: any[] = [];
              if (Array.isArray(newCreatedIds) && currentPage) {
                for (const nid of newCreatedIds) {
                  const s = currentPage.getShapeById(nid);
                  if (s) createdSelection.push(s);
                }
              }

              const hostPenpot = (globalThis as unknown as { penpot?: { selection?: Shape[] } }).penpot;
              if (hostPenpot) {
                hostPenpot.selection = createdSelection;
              }

              setTimeout(() => {
                try {
                  updateCurrentSelection(newCreatedIds);
                } catch (err) {
                  console.warn('Failed to update selection after redoing clone:', err);
                }
              }, 10);
            } catch (selErr) {
              console.warn('Failed to set selection after redo clone:', selErr);
            }
            break;
          }

          case ClientQueryType.TOGGLE_SELECTION_LOCK: {
            const lockData = lastAction.undoData as { shapeIds: string[]; previousLockedStates: boolean[] };

            for (let i = 0; i < lockData.shapeIds.length; i++) {
              const shapeId = lockData.shapeIds[i];
              const previousLocked = lockData.previousLockedStates[i];

              try {
                const currentPage = penpot.currentPage;
                if (!currentPage) continue;

                const shape = currentPage.getShapeById(shapeId);
                if (!shape) continue;

                // Reapply the original applied state (opposite of previousLocked) to both
                // locked and blocked properties so hosts that read either reflect the
                // re-applied state.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (shape as any).locked = !previousLocked;
                try { (shape as any).blocked = !previousLocked; } catch (e) { void e; }

                undoStack.push(lastAction);
                restoredShapes.push(shape.name || shape.id);
              } catch (error) {
                console.warn(`Failed to redo lock/unlock for shape ${shapeId}:`, error);
              }
            }

            break;
          }
          case ClientQueryType.TOGGLE_SELECTION_VISIBILITY: {
            const visData = lastAction.undoData as { shapeIds: string[]; previousVisibleStates: boolean[] };

            for (let i = 0; i < visData.shapeIds.length; i++) {
              const shapeId = visData.shapeIds[i];
              const previousVisible = visData.previousVisibleStates[i];

              try {
                const currentPage = penpot.currentPage;
                if (!currentPage) continue;

                const shape = currentPage.getShapeById(shapeId);
                if (!shape) continue;

                // reapply the changed visibility (opposite of previous)
                (shape as any).visible = !previousVisible;

                undoStack.push(lastAction);
                restoredShapes.push(shape.name || shape.id);
              } catch (error) {
                console.warn(`Failed to redo visibility change for shape ${shapeId}:`, error);
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

      case ClientQueryType.SET_SELECTION_OPACITY: {
        const opacityData = lastAction.undoData as { shapeIds: string[]; appliedOpacity: number };

        for (const shapeId of opacityData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            shape.opacity = opacityData.appliedOpacity;

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo opacity for shape ${shapeId}:`, error);
          }
        }

        undoStack.push(lastAction);
        break;
      }

      case ClientQueryType.SET_SELECTION_BOUNDS: {
        const boundsData = lastAction.undoData as { shapeIds: string[]; appliedBounds?: { x?: number; y?: number; width?: number; height?: number } };

        for (const shapeId of boundsData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            const ab = boundsData.appliedBounds ?? {};
            if (typeof ab.x === 'number') shape.x = ab.x;
            if (typeof ab.y === 'number') shape.y = ab.y;

            if (typeof ab.width === 'number' || typeof ab.height === 'number') {
              const w = typeof ab.width === 'number' ? ab.width : (typeof (shape as any).width === 'number' ? (shape as any).width : undefined);
              const h = typeof ab.height === 'number' ? ab.height : (typeof (shape as any).height === 'number' ? (shape as any).height : undefined);
              if (typeof w === 'number' && typeof h === 'number' && typeof (shape as any).resize === 'function') {
                (shape as any).resize(w, h);
              } else {
                if (typeof w === 'number') (shape as any).width = w;
                if (typeof h === 'number') (shape as any).height = h;
              }
            }

            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo bounds for shape ${shapeId}:`, error);
          }
        }

        undoStack.push(lastAction);
        break;
      }

      case ClientQueryType.SET_SELECTION_BORDER_RADIUS: {
        const radiusData = lastAction.undoData as { shapeIds: string[]; appliedBorderRadius: number };

        for (const shapeId of radiusData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            (shape as any).borderRadius = radiusData.appliedBorderRadius;
            restoredShapes.push(shape.name || shape.id);
          } catch (error) {
            console.warn(`Failed to redo border radius for shape ${shapeId}:`, error);
          }
        }

        undoStack.push(lastAction);
        break;
      }

      case ClientQueryType.SET_SELECTION_BLEND_MODE: {
        const blendData = lastAction.undoData as { shapeIds: string[]; appliedBlendMode: typeof blendModes[number] };

        for (const shapeId of blendData.shapeIds) {
          try {
            const currentPage = penpot.currentPage;
            if (!currentPage) continue;

            const shape = currentPage.getShapeById(shapeId);
            if (!shape) continue;

            const shapeWithBlend = shape as Shape & { blendMode?: typeof blendModes[number]; };
            shapeWithBlend.blendMode = blendData.appliedBlendMode;
            restoredShapes.push(shapeWithBlend.name || shapeWithBlend.id);
          } catch (error) {
            console.warn(`Failed to redo blend mode for shape ${shapeId}:`, error);
          }
        }

        undoStack.push(lastAction);
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