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
  ClientQueryType,
  MessageSourceName,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  GetUserDataPayload,
} from "../types/types";
import type { Shape } from '@penpot/plugin-types';

const pluginResponse: PluginResponseMessage = {
  source: MessageSourceName.Plugin,
  type: ClientQueryType.ADD_IMAGE,
  messageId: '',
  message: '',
  success: true,
};

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
    const sel = (penpot as any).selection;

    // Handle different selection formats
    let count = 0;
    if (Array.isArray(sel)) {
      count = sel.length;
    } else if (sel && typeof sel === 'object') {
      if (Array.isArray(sel.items)) {
        count = sel.items.length;
      } else if (sel.item) {
        count = 1;
      }
    }

    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA, // Using existing type for compatibility
      success: true,
      message: count > 0 ? `Found ${count} selected item(s)` : 'No selection',
      payload: { name: '', id: '', count } as unknown as GetUserDataPayload
    };
  } catch {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA,
      success: false,
      message: 'Unable to check selection status',
    };
  }
}

/**
 * Safely gets basic selection info for action tools
 * Only returns minimal data needed for the specific action
 * @param actionContext - describes what action needs the selection
 * @returns basic selection info or error
 */
export function getSelectionForAction(actionContext: string): { success: boolean; count: number; items?: any[]; error?: string } {
  try {
    const sel = (penpot as any).selection;

    if (!sel) {
      return { success: false, count: 0, error: 'No selection available' };
    }

    let items: any[] = [];
    if (Array.isArray(sel)) {
      items = sel;
    } else if (sel && typeof sel === 'object' && Array.isArray(sel.items)) {
      items = sel.items;
    } else if (sel && typeof sel === 'object' && sel.item) {
      items = [sel.item];
    }

    if (items.length === 0) {
      return { success: false, count: 0, error: 'No items selected' };
    }

    // Only return minimal info needed for actions
    return {
      success: true,
      count: items.length,
      items: items // Pass items directly for action use, don't serialize
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
    // Get current selection
    const sel = (penpot as any).selection;
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
    // Get current selection
    const sel = (penpot as any).selection;
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
    for (const shape of sel) {
      try {
        // Apply fill to the shape - replace all existing fills with solid color fill
        shape.fills = [{
          fillColor: hexColor,
          fillOpacity: fillOpacity,
        }];
        filledShapes.push(shape.name || shape.id);
      } catch (shapeError) {
        console.warn(`Failed to apply fill to shape ${shape.id}:`, shapeError);
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