import {
  FunctionTool,
  ClientQueryType,
  AddImageFromUrlQueryPayload,
  CloneSelectionQueryPayload,
  CloneSelectionPromptResponsePayload,
  GetSelectionInfoResponsePayload,
  ToggleSelectionLockQueryPayload,
  ToggleSelectionLockResponsePayload,
  ToggleSelectionProportionLockQueryPayload,
  ToggleSelectionProportionLockResponsePayload,
  GetSelectionDumpQueryPayload,
  GetSelectionDumpResponsePayload,
  ToggleSelectionVisibilityQueryPayload,
  ToggleSelectionVisibilityResponsePayload,
  SetSelectionOpacityQueryPayload,
  SetSelectionBorderRadiusQueryPayload,
  DeleteSelectionQueryPayload,
  DetachFromComponentQueryPayload,
  SetConstraintsHorizontalQueryPayload,
  SetConstraintsVerticalQueryPayload,
  OpenPageQueryPayload,
  RenamePageQueryPayload,
  ChangePageBackgroundQueryPayload,
  CreatePageQueryPayload,
  ZIndexQueryPayload,
  ConfigureFlexLayoutQueryPayload,
  ConfigureGridLayoutQueryPayload,
  ConfigureRulerGuidesQueryPayload,
  ConfigureBoardGuidesQueryPayload,
  BatchCreatePagesQueryPayload,
} from '@/types/types';
import type {
  SetSelectionBlendModeQueryPayload,
  SetSelectionBlendModeResponsePayload,
  SetSelectionBorderRadiusResponsePayload,
  MoveQueryPayload,
  MoveResponsePayload,
  SetSelectionBoundsQueryPayload,
  SetSelectionBoundsResponsePayload,
  SetConstraintsHorizontalResponsePayload,
  SetConstraintsVerticalResponsePayload,
  PluginResponseMessage,
} from '@/types/types';
import { ReadShapeColorsQueryPayload, ReadPluginLocalStorageQueryPayload, ReadViewportSettingsQueryPayload, UploadMediaFromDataQueryPayload } from '@/types/pluginTypes';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { blendModes } from '@/types/shapeTypes';

// Function to get user data - this would typically come from Penpot context
export const functionTools: FunctionTool[] = [
  {
    id: "get-user-data",
    name: "getUserData",
    description: `
      Use this tool to get information about the active user on Penpot.
      It returns the user name and id.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_USER_DATA, undefined);
      return response;
    },
  }, {
    id: "get-project-data",
    name: "getProjectData",
    description: `
      Use this tool to get information about the active project on Penpot.
      This includes: name, id and pages
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_PROJECT_DATA, undefined);
      return response;
    },
  }, {
    id: "get-available-fonts",
    name: "getAvailableFonts",
    description: `
      Use this tool to get the available fonts on Penpot.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_AVAILABLE_FONTS, undefined);
      return response;
    },
  }, {
    id: "get-current-page",
    name: "getCurrentPage",
    description: `
      Use this tool to get the current page on Penpot.
      This includes: name, id and shapes
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_PAGE, undefined);
      return response;
    },
  },
  {
    id: 'toggle-selection-lock',
    name: 'toggleSelectionLock',
    description: `
      Lock or unlock the currently selected shapes. If called without an explicit 'lock' boolean
      the tool will read the selection and:
      - If all selected shapes are unlocked, it will lock them.
      - If all selected shapes are locked, it will unlock them.
      - If selection contains both locked and unlocked shapes, it will return a prompt payload
        that the UI can use to ask the user whether to lock the unlocked shapes or unlock
        the locked shapes.
    `,
    inputSchema: z.object({
      lock: z.boolean().optional(),
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { lock?: boolean; shapeIds?: string[] }) => {
      // If args undefined (no explicit input), return read-only selection info
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      // Read selection first for message tailoring, then call the toggle action
      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      // Ensure we forward shapeIds to plugin when available so plugin handlers that
      // rely on explicit shape IDs (instead of relying on penpot.selection) can operate
      // in environments where the selection proxy isn't available.
      if (!args.shapeIds && selectionPayload && Array.isArray(selectionPayload.selectedObjects)) {
        args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) } as unknown as { lock?: boolean; shapeIds?: string[] };
      }

      // Call plugin to lock/unlock (explicit or inferred)
      const response = await sendMessageToPlugin(ClientQueryType.TOGGLE_SELECTION_LOCK, args as unknown as ToggleSelectionLockQueryPayload);

      // If plugin returned mixed-selection info, surface it in the message
      const payload = response.payload as ToggleSelectionLockResponsePayload | undefined;
      if (payload && Array.isArray(payload.lockedShapes) && Array.isArray(payload.unlockedShapes) && payload.lockedShapes.length > 0 && payload.unlockedShapes.length > 0) {
        response.message = `The selection contains locked and unlocked shapes. Locked: ${payload.lockedShapes.map(s => s.name ?? s.id).join(', ')}; Unlocked: ${payload.unlockedShapes.map(s => s.name ?? s.id).join(', ')}. Specify lock=true to lock all unlocked shapes, or lock=false to unlock all locked shapes.`;
      }

      return response;
    },
  },
  {
    id: 'toggle-selection-proportion-lock',
    name: 'toggleSelectionProportionLock',
    description: `
        Toggle whether selected shapes keep their proportions (aspect ratio) when resized.
        If called without an explicit 'lock' boolean the tool will read the selection and:
        - If all selected shapes are unlocked (proportions free), it will lock proportions.
        - If all selected shapes are locked (proportions fixed), it will unlock them.
        - If selection contains both locked and unlocked shapes, it will return a prompt payload
          that the UI can use to ask the user which action to take.
      `,
    inputSchema: z.object({ lock: z.boolean().optional(), shapeIds: z.array(z.string()).optional() }),
    function: async (args?: { lock?: boolean; shapeIds?: string[] }) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      // If selection info failed to return objects, try the detailed dump which
      // prefers page fallback and provides currentSelectionIds. Use that as a
      // robust fallback so our mutation call receives explicit shapeIds.
      if (!args.shapeIds) {
        if (selectionPayload && Array.isArray(selectionPayload.selectedObjects) && selectionPayload.selectedObjects.length > 0) {
          args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) } as unknown as { lock?: boolean; shapeIds?: string[] };
        } else {
          const dumpResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_DUMP, undefined);
          const dumpPayload = dumpResp.payload as GetSelectionDumpResponsePayload | undefined;
          if (dumpPayload && Array.isArray(dumpPayload.selectedObjects) && dumpPayload.selectedObjects.length > 0) {
            args = { ...args, shapeIds: dumpPayload.selectedObjects.map((o: any) => String(o.id)) } as unknown as { lock?: boolean; shapeIds?: string[] };
          }
        }
      }

      let response = await sendMessageToPlugin(ClientQueryType.TOGGLE_SELECTION_PROPORTION_LOCK, args as unknown as ToggleSelectionProportionLockQueryPayload);

      const payload = response.payload as ToggleSelectionProportionLockResponsePayload | undefined;
      // If the plugin returned a selectionSnapshot, attach it to the message so
      // the UI can display verification of the final state immediately.
      if (payload && Array.isArray((payload as any).selectionSnapshot)) {
        response.message = `${response.message ?? ''}\n\nVerification:\n` + ((payload as any).selectionSnapshot.map((s: any) => ` • ${s.id} (${s.name ?? s.id}): proportions locked=${s.finalRatioLocked}`).join('\n'));
      }

      // Auto-retry flow: if the plugin returned no selection or returned a no-op
      // where selectionSnapshot indicates proportions are still locked, attempt
      // to fetch a fresh dump and retry the toggle once with resolved ids.
      const shouldRetry = (() => {
        const msg = String(response.message ?? '').toUpperCase();
        if (!response.success && (msg === 'NO_SELECTION' || msg.includes('NO_SHAPES_MATCHED') || msg.includes('NO_SHAPES_TO_UNLOCK') || msg.includes('NO_SHAPES_TO_LOCK'))) return true;
        // also retry if plugin returned a no-op but snapshot indicates remaining locks
        if (!response.success && Array.isArray((payload as any)?.selectionSnapshot)) {
          const snapshot = (payload as any).selectionSnapshot as Array<any>;
          return snapshot.some(s => !!s.finalRatioLocked);
        }
        return false;
      })();

      if (shouldRetry) {
        // fetch a dump and try again with explicit ids (one retry only)
        const dumpResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_DUMP, undefined);
        const dumpPayload = dumpResp.payload as GetSelectionDumpResponsePayload | undefined;
        if (dumpPayload && Array.isArray(dumpPayload.selectedObjects) && dumpPayload.selectedObjects.length > 0) {
          const retryArgs = { ...args, shapeIds: dumpPayload.selectedObjects.map((o: any) => String(o.id)) } as unknown as { lock?: boolean; shapeIds?: string[] };
          response = await sendMessageToPlugin(ClientQueryType.TOGGLE_SELECTION_PROPORTION_LOCK, retryArgs as unknown as ToggleSelectionProportionLockQueryPayload);
          const retryPayload = response.payload as ToggleSelectionProportionLockResponsePayload | undefined;
          if (retryPayload && Array.isArray((retryPayload as any).selectionSnapshot)) {
            response.message = `${response.message ?? ''}\n\nVerification:\n` + ((retryPayload as any).selectionSnapshot.map((s: any) => ` • ${s.id} (${s.name ?? s.id}): proportions locked=${s.finalRatioLocked}`).join('\n'));
          }
        }
      }
      if (payload && Array.isArray(payload.lockedShapes) && Array.isArray(payload.unlockedShapes) && payload.lockedShapes.length > 0 && payload.unlockedShapes.length > 0) {
        response.message = `The selection contains shapes with locked proportions and free proportions. Locked: ${payload.lockedShapes.map(s => s.name ?? s.id).join(', ')}; Unlocked: ${payload.unlockedShapes.map(s => s.name ?? s.id).join(', ')}. Specify lock=true to lock all unlocked shapes, or lock=false to unlock all locked shapes.`;
      }

      return response;
    },
  },
  {
    id: 'toggle-selection-visibility',
    name: 'toggleSelectionVisibility',
    description: `
          Hide or unhide the currently selected shapes. If called without an explicit 'hide' boolean
          the tool will read the selection and:
          - If all selected shapes are visible, it will hide them.
          - If all selected shapes are hidden, it will unhide them.
          - If selection contains both visible and hidden shapes, it will return a prompt payload
            that the UI can use to ask the user whether to hide the visible shapes or unhide the hidden shapes.
        `,
    inputSchema: z.object({
      hide: z.boolean().optional(),
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { hide?: boolean; shapeIds?: string[] }) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      if (!args.shapeIds && selectionPayload && Array.isArray(selectionPayload.selectedObjects)) {
        args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) } as unknown as { hide?: boolean; shapeIds?: string[] };
      }

      const response = await sendMessageToPlugin(ClientQueryType.TOGGLE_SELECTION_VISIBILITY, args as unknown as ToggleSelectionVisibilityQueryPayload);

      const payload = response.payload as ToggleSelectionVisibilityResponsePayload | undefined;
      if (payload && Array.isArray(payload.hiddenShapes) && Array.isArray(payload.unhiddenShapes) && payload.hiddenShapes.length > 0 && payload.unhiddenShapes.length > 0) {
        response.message = `The selection contains hidden and visible shapes. Hidden: ${payload.hiddenShapes.map(s => s.name ?? s.id).join(', ')}; Visible: ${payload.unhiddenShapes.map(s => s.name ?? s.id).join(', ')}. Specify hide=true to hide visible shapes, or hide=false to unhide the hidden shapes.`;
      }

      return response;
    },
  },
  {
    id: 'flip-selection-horizontal',
    name: 'flipSelectionHorizontal',
    description: `
        Flip the currently selected shapes horizontally (mirror across vertical axis).
        This tool works on all selectable objects including shapes, boards, images, paths, and groups.
        The flip operation toggles the flipX property of each shape.
      `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { shapeIds?: string[] }) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      if (!args.shapeIds && selectionPayload && Array.isArray(selectionPayload.selectedObjects)) {
        args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) };
      }

      const response = await sendMessageToPlugin(ClientQueryType.FLIP_SELECTION_HORIZONTAL, args);
      return response;
    },
  },
  {
    id: 'flip-selection-vertical',
    name: 'flipSelectionVertical',
    description: `
        Flip the currently selected shapes vertically (mirror across horizontal axis).
        This tool works on all selectable objects including shapes, boards, images, paths, and groups.
        The flip operation toggles the flipY property of each shape.
      `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { shapeIds?: string[] }) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      if (!args.shapeIds && selectionPayload && Array.isArray(selectionPayload.selectedObjects)) {
        args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) };
      }

      const response = await sendMessageToPlugin(ClientQueryType.FLIP_SELECTION_VERTICAL, args);
      return response;
    },
  },
  {
    id: 'move-selection',
    name: 'moveSelection',
    description: `
      Move the currently selected shapes using dx/dy (relative) or x/y (absolute) coordinates.
      Locks are respected: locked shapes will be skipped. If locked shapes were skipped, the function
      will append a user-friendly message to the plugin response showing the names of skipped shapes.
    `,
    inputSchema: z.object({
      dx: z.number().optional(),
      dy: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    function: async (args: MoveQueryPayload) => {
      if (!args || (typeof args.dx === 'undefined' && typeof args.dy === 'undefined' && typeof args.x === 'undefined' && typeof args.y === 'undefined')) {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      // Read selection before performing the action to tailor the user message if locked shapes
      // are skipped by the move operation.
      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);

      const response = await sendMessageToPlugin(ClientQueryType.MOVE, args as unknown as MoveQueryPayload);
      // Tailor the message depending on number of skipped locked shapes and selection context
      const payload = response.payload as MoveResponsePayload | undefined;
      if (payload?.skippedLockedNames && payload.skippedLockedNames.length > 0) {
        const skipped = payload.skippedLockedNames;
        const selectionCount = ((selectionResp.payload as unknown) as { selectionCount?: number })?.selectionCount ?? 0;

        if (skipped.length === 1) {
          const name = skipped[0];
          if (selectionCount <= 1) {
            response.message = `We couldn't move ${name} because it is locked. I can provide instructions to unlock it, or unlock it and retry the move.`;
          } else {
            response.message = `One of the selected shapes, ${name}, is locked and was skipped. The other shapes were moved. I can provide instructions to unlock it, or re-run the move once it's unlocked.`;
          }
        } else {
          response.message = `The following shapes are locked and were skipped: ${skipped.join(', ')}. The other shapes were moved; I can provide instructions to unlock them so I can also move them.`;
        }
      }

      return response;
    },
  },
  {
    id: 'clone-selection',
    name: 'cloneSelection',
    description: `
      Duplicate the current selection to the right with a small offset and automatic collision fallback.
      Locked shapes are skipped unless you explicitly disable skipLocked, and you will be prompted if locked shapes
      would otherwise block the action.
    `,
    inputSchema: z.object({
      offset: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
      }).optional(),
      skipLocked: z.boolean().optional(),
      keepPosition: z.boolean().optional(),
      fallback: z.enum(['right', 'below', 'grid', 'auto']).optional(),
    }),
    function: async (args?: CloneSelectionQueryPayload) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;
      if (!selectionPayload || selectionPayload.selectionCount === 0) {
        selectionResp.message = 'Select at least one shape before cloning the selection.';
        return selectionResp;
      }

      const cloneArgs: CloneSelectionQueryPayload = {
        offset: args.offset ?? { x: 10, y: 10 },
        skipLocked: typeof args.skipLocked === 'boolean' ? args.skipLocked : true,
        keepPosition: args.keepPosition ?? false,
        fallback: args.fallback ?? 'auto',
      };

      const response = await sendMessageToPlugin(ClientQueryType.CLONE_SELECTION, cloneArgs);
      const promptPayload = response.payload as CloneSelectionPromptResponsePayload | undefined;
      if (!response.success && promptPayload && promptPayload.lockedShapes.length > 0) {
        response.message = promptPayload.message ?? `Selection contains locked shapes (${promptPayload.lockedShapes.map(shape => shape.name ?? shape.id).join(', ')}). Specify skipLocked=true to skip them or unlock them before cloning.`;
      }

      return response;
    },
  },
  {
    id: 'set-selection-opacity',
    name: 'setSelectionOpacity',
    description: `Set the opacity of the currently selected shapes (0 = transparent, 1 = opaque). Call without arguments to just return info about the selection so the UI can prompt for a value.`,
    inputSchema: z.object({
      // Accept numbers or strings (e.g. "50%" or "50"), we'll parse below
      opacity: z.union([z.number(), z.string()]).optional(),
    }),
    function: async (args?: { opacity?: number | string }) => {
      if (!args || typeof args.opacity === 'undefined') {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      // Normalize opacity to a number between 0 and 1.
      const raw = args.opacity;
      let parsedOpacity: number | undefined;

      if (typeof raw === 'number') {
        // Treat numbers > 1 as percentages (e.g. 50 -> 0.5)
        parsedOpacity = raw > 1 ? raw / 100 : raw;
      } else if (typeof raw === 'string') {
        const s = raw.trim();
        // If it's a percent like '50%' remove the % and parse
        const percentMatch = s.match(/^([0-9,.]+)\s*%$/);
        if (percentMatch) {
          const n = Number(percentMatch[1].replace(/,/g, '.'));
          parsedOpacity = Number.isFinite(n) ? n / 100 : undefined;
        } else {
          // Natural-language parsing (common phrases)
          const norm = s.toLowerCase().replace(/[-_]/g, ' ').trim();
          if (norm === 'half' || norm === 'half opacity' || norm === 'half-opacity' || norm === 'halfopacity') {
            parsedOpacity = 0.5;
          } else if (norm === 'transparent' || norm === 'invisible') {
            parsedOpacity = 0;
          } else if (norm === 'opaque' || norm === 'full' || norm === 'fully opaque') {
            parsedOpacity = 1;
          } else if (norm === 'quarter' || norm === 'one quarter') {
            parsedOpacity = 0.25;
          } else if (norm === 'three quarters' || norm === 'three quarter') {
            parsedOpacity = 0.75;
          } else {
            // try parsing as a plain number
            const n = Number(s.replace(/,/g, '.'));
            if (Number.isFinite(n)) {
              // Interpret numbers > 1 as percentages (e.g. 50 -> 0.5)
              parsedOpacity = n > 1 ? n / 100 : n;
            }
          }
        }
      }

      if (typeof parsedOpacity !== 'number' || !Number.isFinite(parsedOpacity)) {
        // Unknown input; return read-only selection to allow UI to prompt
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      // Validate final value
      if (parsedOpacity < 0 || parsedOpacity > 1) {
        return { success: false, message: 'Opacity must be between 0 and 100% (or 0.0-1.0).', source: 'penpotWizardClient', type: ClientQueryType.SET_SELECTION_OPACITY, messageId: '' } as unknown as Record<string, unknown>;
      }

      // Pass normalized value to plugin
      args = { opacity: parsedOpacity } as unknown as SetSelectionOpacityQueryPayload;

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;
      if (!selectionPayload || selectionPayload.selectionCount === 0) {
        selectionResp.message = 'Select at least one shape before changing opacity.';
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.SET_SELECTION_OPACITY, args as unknown as SetSelectionOpacityQueryPayload);
      return response;
    },
  },
  {
    id: 'set-selection-blend-mode',
    name: 'setSelectionBlendMode',
    description: `Set the blend mode of the selected shapes. Call without a blend mode to get selection context so the UI can prompt for one.`,
    inputSchema: z.object({
      blendMode: z.enum(blendModes).optional(),
    }),
    function: async (args?: SetSelectionBlendModeQueryPayload) => {
      if (!args || typeof args.blendMode !== 'string') {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;
      if (!selectionPayload || selectionPayload.selectionCount === 0) {
        selectionResp.message = 'Select at least one shape before changing the blend mode.';
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.SET_SELECTION_BLEND_MODE, args);
      const payload = response.payload as SetSelectionBlendModeResponsePayload | undefined;
      if (payload && payload.changedShapeIds.length === 0) {
        response.message = 'Blend mode change did not apply to any shapes. Ensure the shapes support blend modes.';
      }
      return response;
    },
  },
  {
    id: 'set-selection-border-radius',
    name: 'setSelectionBorderRadius',
    description: `Set the border radius (px) of the selected shapes. Call without a value to get selection context so the UI can prompt for one.`,
    inputSchema: z.object({
      borderRadius: z.number().min(0).optional(),
    }),
    function: async (args?: SetSelectionBorderRadiusQueryPayload) => {
      if (!args || typeof args.borderRadius !== 'number') {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;
      if (!selectionPayload || selectionPayload.selectionCount === 0) {
        selectionResp.message = 'Select at least one shape before changing the border radius.';
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.SET_SELECTION_BORDER_RADIUS, args);
      const payload = response.payload as SetSelectionBorderRadiusResponsePayload | undefined;
      if (payload && payload.changedShapeIds.length === 0) {
        response.message = 'Border radius change did not apply to any shapes. Ensure the shapes support borderRadius.';
      }
      return response;
    },
  },
  {
    id: 'set-selection-bounds',
    name: 'setSelectionBounds',
    description: `Set the bounds (x, y, width, height) of the selected shapes. Call without any values to get selection context so the UI can prompt for values.`,
    inputSchema: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
    }),
    function: async (args?: SetSelectionBoundsQueryPayload) => {
      if (!args || (typeof args.x !== 'number' && typeof args.y !== 'number' && typeof args.width !== 'number' && typeof args.height !== 'number')) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;
      if (!selectionPayload || selectionPayload.selectionCount === 0) {
        selectionResp.message = 'Select at least one shape before changing bounds.';
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.SET_SELECTION_BOUNDS, args);
      const payload = response.payload as SetSelectionBoundsResponsePayload | undefined;
      if (payload && payload.changedShapeIds.length === 0) {
        response.message = 'Bounds change did not apply to any shapes. Ensure the shapes support bounds.';
      }
      return response;
    },
  },
  {
    id: "add-image-from-url",
    name: "addImageFromUrl",
    description: `
        Upload an image from a URL and place it on the Penpot canvas.
        Provide either a name (optional) and a fully-qualified URL to the image.
        The plugin will download the URL and add a rectangle with the uploaded image as a fill.
      `,
    inputSchema: z.object({
      name: z.string().optional(),
      url: z.string().url(),
    }),
    function: async (input: { name?: string; url: string }) => {
      const response = await sendMessageToPlugin(ClientQueryType.ADD_IMAGE_FROM_URL, input as unknown as AddImageFromUrlQueryPayload);
      return response;
    },
  },
  {
    id: "get-current-theme",
    name: "getCurrentTheme",
    description: `
      Use this tool to get the current theme (light or dark) on Penpot.
      This includes: 'light' or 'dark'
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_THEME, undefined);
      return response;
    },
  },
  {
    id: "get-active-users",
    name: "getActiveUsers",
    description: `
      Use this tool to list all the active collaborators currently working on the same Penpot project.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_ACTIVE_USERS, undefined);
      return response;
    },
  },
  {
    id: "get-file-versions",
    name: "getFileVersions",
    description: `
      Use this tool to get all saved versions of the current Penpot file.
      It lists version labels, creation dates, and whether they are autosaves or manual saves.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_FILE_VERSIONS, undefined);
      return response;
    },
  },

  {
    id: "create-shape-from-svg",
    name: "createShapeFromSvg",
    description: `
      Create a new shape in Penpot from an SVG string.
      This tool takes valid SVG markup and converts it into editable Penpot shapes.
      Useful for importing custom icons, logos, or complex graphics from SVG format.
      
      The tool uses the current selection to determine positioning:
      - If shapes are selected: positions the new SVG shape next to the first selected shape
      - If no shapes are selected: positions the new SVG shape at a default location
      
      Parameters:
      - svgString: A valid SVG string containing the shape definition
      - name: Optional name for the created shape
      
      The SVG should be a valid XML string with proper SVG elements like <svg>, <path>, <circle>, etc.
      Complex SVGs with multiple elements will be grouped together as a single shape.
    `,
    inputSchema: z.object({
      svgString: z.string().min(1, "SVG string cannot be empty"),
      name: z.string().optional(),
    }),
    function: async (input: { svgString: string; name?: string }) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_SHAPE_FROM_SVG, input);
      return response;
    },
  },

  // NOTE: undo-last-action should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without redo functionality, users cannot easily restore
  // changes they just undid, creating a frustrating user experience.
  {
    id: "undo-last-action",
    name: "undoLastAction",
    description: `
      Undo the most recent action performed by the AI assistant.
      This can reverse fill color changes, blur effects, and other modifications made to shapes.
      Use this when the user wants to revert the last change made by the assistant.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.UNDO_LAST_ACTION, undefined);
      return response;
    },
  },
  // NOTE: redo-last-action should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without redo functionality, users cannot easily restore
  // changes they just undid, creating a frustrating user experience.
  {
    id: "redo-last-action",
    name: "redoLastAction",
    description: `
      Redo the most recently undone action performed by the AI assistant.
      This can reapply fill color changes, blur effects, and other modifications that were previously undone.
      Use this when the user wants to restore a change they just undid.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.REDO_LAST_ACTION, undefined);
      return response;
    },
  },
  {
    id: "export-selection-as-svg",
    name: "exportSelectionAsSvg",
    description: `
      Export the currently selected shapes as a single SVG file with multiple save options.
      
      **Background Options:**
      - Defaults to transparent background
      - Set includeBackground=true for white background
      
      **Save Options Provided:**
      - Copy SVG code for manual saving
      - Blob URL for direct downloading
      - Instructions for text editor saving
      - Comparison with Penpot's native export
      
      Use this tool when:
      - User wants to export their current selection as SVG
      - User needs vector graphics for web development
      - User wants to share designs in SVG format
      - User needs scalable graphics for print or digital use
      
      The exported SVG combines all selected shapes into one document with proper positioning.
    `,
    inputSchema: z.object({
      includeBackground: z.boolean().optional().describe("Whether to include a white background in the exported SVG. Defaults to false (transparent)."),
    }),
    function: async (args) => {
      const response = await sendMessageToPlugin(ClientQueryType.EXPORT_SELECTION_AS_SVG, args);
      return response;
    },
  },
  {
    id: "resize-selection",
    name: "resizeSelection",
    description: `
      Use this tool to resize the currently selected shapes, boards, images, or other selectable objects in Penpot using scale factors.
      Scale factors determine how much to multiply the current dimensions by (e.g., 1.5 = 50% larger, 0.5 = half size).
      This tool works on all selectable objects including shapes, boards, images, and groups.
      If you call this tool with no scale factors, it returns the current selection information (dimensions, position) so the director or UI can display them before asking for scale.
      Examples:
      - scaleX: 2.0, scaleY: 2.0 → Double the size in both dimensions
      - scaleX: 1.5 → Make 50% wider (height unchanged)
      - scaleX: 0.5, scaleY: 0.5 → Half the size in both dimensions
      - scaleX: 1.2, maintainAspectRatio: true → 20% larger maintaining proportions
    `,
    inputSchema: z.object({
      scaleX: z.number().positive().optional().describe("Scale factor for width (e.g., 1.5 = 50% larger, 0.5 = half width)."),
      scaleY: z.number().positive().optional().describe("Scale factor for height (e.g., 2.0 = double height, 0.75 = 25% smaller)."),
      maintainAspectRatio: z.boolean().optional().default(true).describe("Whether to maintain the aspect ratio when resizing. If true, uses scaleX for both dimensions. Defaults to true."),
    }),
    function: async (args) => {
      // If no scale factors are provided, return read-only selection information
      // so the director or UI can present the current dimensions to the user.
      if (!args || (typeof args.scaleX === 'undefined' && typeof args.scaleY === 'undefined')) {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.RESIZE, args);
      return response;
    },
  },
  {
    id: "rotate-selection",
    name: "rotateSelection",
    description: `
      Rotate the currently selected shapes (boards, images, paths, text, etc.) by a given angle in degrees.
      Positive values rotate clockwise. If no angle is supplied, the tool returns read-only selection info so the UI can show current rotations.
    `,
    inputSchema: z.object({
      angle: z.number().optional().describe('Rotation angle in degrees. Positive clockwise.'),
    }),
    function: async (args) => {
      if (!args || typeof args.angle !== 'number') {
        const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
        return selectionResp;
      }

      const response = await sendMessageToPlugin(ClientQueryType.ROTATE, args);
      return response;
    },
  },
  {
    id: "get-selection-info",
    name: "getSelectionInfo",
    description: `
      Get detailed information about the currently selected shapes in Penpot.
      Returns properties like dimensions, position, type, and other attributes for each selected shape.
      This is useful for understanding what shapes are selected before performing operations.
      
      Returns an array of shape information including:
      - id: Unique identifier
      - name: Shape name (if any)
      - type: Shape type (rect, circle, path, text, etc.)
      - x, y: Position coordinates
      - width, height: Dimensions
      - rotation: Rotation angle (if any)
      - opacity: Opacity value (if any)

      NOTE: This tool is READ-ONLY — use only for querying selection state. Do NOT call this tool when you intend to modify shapes.
      To modify shapes, use action tools (e.g., 'resize-selection') which will internally use safe action APIs (getSelectionForAction()).
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      return response;
    },
  },
  {
    id: "dump-selection",
    name: "dumpSelection",
    description: `
      Read-only dump of the current selection as returned by the plugin runtime. This returns a compact
      but more detailed snapshot of each selected shape (including common lock/proportion-related keys).
      Useful for debugging and diagnosing inspector mismatches.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_DUMP, undefined);
      return response;
    },
  },
  {
    id: 'delete-selection',
    name: 'Delete Selection',
    description: `
      Deletes the currently selected shapes from the canvas.
      This uses the strict 'shape.remove()' API.
      
      WARNING: Undoing this action has limitations:
      1. Restored shapes will have NEW IDs (original IDs are lost).
      2. Some complex properties or nested structures might not be fully restored.
      
      CRITICAL: You MUST explicitly warn the user about these limitations and obtain their confirmation BEFORE calling this tool.
      Do not assume consent even if they asked to "delete". Explain the risk first.
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args?: { shapeIds?: string[] }) => {
      if (!args) {
        return sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      }

      const selectionResp = await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
      const selectionPayload = selectionResp.payload as GetSelectionInfoResponsePayload | undefined;

      if (!args.shapeIds && selectionPayload && Array.isArray(selectionPayload.selectedObjects)) {
        args = { ...args, shapeIds: selectionPayload.selectedObjects.map(o => o.id) };
      }

      const response = await sendMessageToPlugin(ClientQueryType.DELETE_SELECTION, args as unknown as DeleteSelectionQueryPayload);

      return response;
    },
  },
  {
    id: 'detach-from-component',
    name: 'Detach From Component',
    description: `
      Detaches the selected component instances, converting them into basic groups/shapes.
      This uses the 'shape.detach()' API.
      
      WARNING: Undoing this action has limitations:
      1. The restored component instance will have a NEW ID.
      2. Any overrides applied to the instance might be lost or reset.
      
      CRITICAL: You MUST explicitly warn the user about these limitations and obtain their confirmation BEFORE calling this tool.
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
    }),
    function: async (args: DetachFromComponentQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.DETACH_FROM_COMPONENT, args);
      return response;
    },
  },
  {
    id: 'set-constraints-horizontal',
    name: 'Set Constraints Horizontal',
    description: `
      Sets the horizontal constraint for selected shapes.
      
      Constraints control how a shape behaves when its parent container is resized.
      
      Options:
      - 'left': Pin to left edge
      - 'right': Pin to right edge
      - 'leftright': Stretch between left and right
      - 'center': Stay centered horizontally
      - 'scale': Scale with parent width
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
      constraint: z.enum(['left', 'right', 'leftright', 'center', 'scale']),
    }),
    function: async (args: SetConstraintsHorizontalQueryPayload): Promise<PluginResponseMessage & { payload?: SetConstraintsHorizontalResponsePayload }> => {
      const response = await sendMessageToPlugin(ClientQueryType.SET_CONSTRAINTS_HORIZONTAL, args);
      return response;
    },
  },
  {
    id: 'set-constraints-vertical',
    name: 'Set Constraints Vertical',
    description: `
      Sets the vertical constraint for selected shapes.
      
      Constraints control how a shape behaves when its parent container is resized.
      
      Options:
      - 'top': Pin to top edge
      - 'bottom': Pin to bottom edge
      - 'topbottom': Stretch between top and bottom
      - 'center': Stay centered vertically
      - 'scale': Scale with parent height
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional(),
      constraint: z.enum(['top', 'bottom', 'topbottom', 'center', 'scale']),
    }),
    function: async (args: SetConstraintsVerticalQueryPayload): Promise<PluginResponseMessage & { payload?: SetConstraintsVerticalResponsePayload }> => {
      const response = await sendMessageToPlugin(ClientQueryType.SET_CONSTRAINTS_VERTICAL, args);
      return response;
    },
  },
  {
    id: 'open-page',
    name: 'Open Page',
    description: `
      Navigate to a specific page in the current Penpot file.
      
      You can specify the page either by:
      - pageId: The unique ID of the page
      - pageName: The name of the page
      
      At least one of these parameters must be provided.
    `,
    inputSchema: z.object({
      pageId: z.string().optional().describe('The unique ID of the page to open'),
      pageName: z.string().optional().describe('The name of the page to open'),
    }),
    function: async (args: OpenPageQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.OPEN_PAGE, args);
      return response;
    },
  },
  {
    id: 'rename-page',
    name: 'Rename Page',
    description: `
      Rename an existing page in the current Penpot file.
      
      You can specify which page to rename using pageId, or it will rename the current page.
    `,
    inputSchema: z.object({
      pageId: z.string().optional().describe('The ID of the page to rename (defaults to current page)'),
      newName: z.string().describe('The new name for the page'),
    }),
    function: async (args: RenamePageQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.RENAME_PAGE, args);
      return response;
    },
  },
  {
    id: 'change-page-background',
    name: 'Change Page Background',
    description: `
      Change the background color of a page in the current Penpot file.
      
      Sets the background color via the page's root shape fills property.
    `,
    inputSchema: z.object({
      pageId: z.string().optional().describe('The ID of the page (defaults to current page)'),
      backgroundColor: z.string().describe('Background color in hex format (e.g., #FFFFFF, #336699)'),
    }),
    function: async (args: ChangePageBackgroundQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CHANGE_PAGE_BACKGROUND, args);
      return response;
    },
  },
  {
    id: 'create-page',
    name: 'Create Page',
    description: `
      Create a new page in the current Penpot file.
      
      Optionally name the page and navigate to it after creation.
    `,
    inputSchema: z.object({
      name: z.string().optional().describe('Optional name for the new page'),
      openAfterCreate: z.boolean().optional().describe('Whether to navigate to the new page after creating it'),
    }),
    function: async (args: CreatePageQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_PAGE, args);
      return response;
    },
  },
  {
    id: 'batch-create-pages',
    name: 'batchCreatePages',
    description: `
      Use this tool to create multiple pages at once.
      It takes an array of page names and creates them in order.
      Returns the list of created pages with their IDs and names.
    `,
    inputSchema: z.object({
      pageNames: z.array(z.string()).min(1).describe('Array of names for the new pages'),
    }),
    function: async (args) => {
      const payload: BatchCreatePagesQueryPayload = {
        pageNames: args.pageNames,
      };
      const response = await sendMessageToPlugin(ClientQueryType.BATCH_CREATE_PAGES, payload);
      return response;
    },
  },
  {
    id: 'set-layout-z-index',
    name: 'setLayoutZIndex',
    description: `
      ⚠️ IMPORTANT LIMITATIONS:
      1. This tool ONLY works for shapes inside Flex or Grid layouts
      2. Z-index controls VISUAL OVERLAP only, NOT layer panel order
      3. The Layers panel order will NOT change - shapes stay in the same position
      4. You will only see changes when shapes OVERLAP each other
      
      Control the stacking order (z-index) of overlapping shapes within Flex or Grid layout containers.
      Z-index determines which element appears in front when multiple elements occupy the same space.
      
      Requirements:
      - The shape MUST be inside a parent with Flex Layout or Grid Layout enabled
      - Regular shapes without layouts will fail with an error message
      - Shapes must OVERLAP for z-index changes to be visible
      
      Actions:
      - 'bring-to-front': Set z-index higher than all siblings (appears on top when overlapping)
      - 'send-to-back': Set z-index lower than all siblings (appears at bottom when overlapping)
      - 'bring-forward': Increase z-index by 1
      - 'send-backward': Decrease z-index by 1
      - 'set-index': Set exact z-index value (requires index parameter)
      
      IMPORTANT: After using this tool, always explain to the user:
      "The z-index has been updated, but you will NOT see a change in the Layers panel order.
      Z-index only affects which shape appears in front when shapes overlap."
    `,
    inputSchema: z.object({
      action: z.enum(['bring-to-front', 'send-to-back', 'bring-forward', 'send-backward', 'set-index']),
      shapeIds: z.array(z.string()).optional().describe('Optional array of shape IDs. If not provided, uses current selection'),
      index: z.number().optional().describe('Required for set-index action. The target z-index value (higher = more in front)'),
    }),
    function: async (args: ZIndexQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.Z_INDEX_ACTION, args);
      return response;
    },
  },
  {
    id: 'read-shape-colors',
    name: 'Read Shape Colors',
    description: `
      Reads the fill and stroke colors of the selected shapes.
      Returns a list of colors (hex/rgba) and their usage (fill/stroke) for each shape.
      Useful for analyzing the color palette of a selection.
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional().describe('Optional list of shape IDs to read colors from. If omitted, uses current selection.'),
    }),
    function: async (args: ReadShapeColorsQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.READ_SHAPE_COLORS, args);
      return response;
    },
  },
  {
    id: 'read-library-context',
    name: 'Read Library Context',
    description: `
      Reads metadata about the current file's local library and any connected libraries.
      Returns information about available colors, typographies, and components.
      Useful for understanding the design system context.
    `,
    inputSchema: z.object({}),
    function: async (args: any) => {
      const response = await sendMessageToPlugin(ClientQueryType.READ_LIBRARY_CONTEXT, args);
      return response;
    },
  },
  {
    id: 'read-plugin-local-storage',
    name: 'Read Plugin Local Storage',
    description: `
      Reads data stored in the plugin's local storage (document-level persistence).
      Can read a specific key. If no key is provided, it currently returns an empty object as listing all keys is not supported.
      Useful for retrieving saved plugin settings or state.
    `,
    inputSchema: z.object({
      key: z.string().optional().describe('The key to read data for. If omitted, returns empty.'),
    }),
    function: async (args: ReadPluginLocalStorageQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.READ_PLUGIN_LOCAL_STORAGE, args as any);
      return response;
    },
  },
  {
    id: 'read-viewport-settings',
    name: 'Read Viewport Settings',
    description: `
      Reads the current viewport settings including zoom level and center position.
      Returns zoom value and center coordinates (x, y).
      Useful for understanding the current view state.
    `,
    inputSchema: z.object({}),
    function: async (args: ReadViewportSettingsQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.READ_VIEWPORT_SETTINGS, args as any);
      return response;
    },
  },
  {
    id: 'upload-media-from-data',
    name: 'Upload Media From Data',
    description: `
      Uploads an image to Penpot from a URL.
      Fetches the image from the provided URL and uploads it to the current file's media library.
      Returns the uploaded image data including id, name, width, and height.
    `,
    inputSchema: z.object({
      url: z.string().describe('URL to fetch the image from'),
      name: z.string().optional().describe('Optional name for the uploaded image'),
    }),
    function: async (args: UploadMediaFromDataQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.UPLOAD_MEDIA_FROM_DATA, args as any);
      return response;
    },
  },
  {
    id: 'configure-flex-layout',
    name: 'configureFlexLayout',
    description: `
      Configures flex layout properties for selected boards or groups.
      Can set container properties (direction, wrap, alignment, gaps, padding, sizing)
      and child properties (sizing, margins, alignment, z-index).
      Can also remove flex layout from the container.
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional().describe('Optional list of shape IDs to apply the layout to. If omitted, applies to current selection.'),
      remove: z.boolean().optional().describe('If true, removes the flex layout from the container.'),
      dir: z.enum(['row', 'row-reverse', 'column', 'column-reverse']).optional().describe('Flex direction.'),
      wrap: z.enum(['wrap', 'nowrap']).optional().describe('Flex wrap behavior.'),
      alignItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('Alignment of items along the cross axis.'),
      alignContent: z.enum(['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('Alignment of content lines along the cross axis.'),
      justifyItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('Justification of items along the main axis.'),
      justifyContent: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('Justification of content along the main axis.'),
      rowGap: z.number().optional().describe('Gap between rows.'),
      columnGap: z.number().optional().describe('Gap between columns.'),
      topPadding: z.number().optional().describe('Top padding.'),
      rightPadding: z.number().optional().describe('Right padding.'),
      bottomPadding: z.number().optional().describe('Bottom padding.'),
      leftPadding: z.number().optional().describe('Left padding.'),
      horizontalPadding: z.number().optional().describe('Horizontal padding (sets both left and right).'),
      verticalPadding: z.number().optional().describe('Vertical padding (sets both top and bottom).'),
      horizontalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('Horizontal sizing behavior of the container.'),
      verticalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('Vertical sizing behavior of the container.'),
      childProperties: z.object({
        shapeIds: z.array(z.string()).optional().describe('Specific children to modify. If omitted, applies to all children.'),
        absolute: z.boolean().optional().describe('If true, positions the child absolutely within the container.'),
        zIndex: z.number().optional().describe('Z-index of the child.'),
        horizontalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('Horizontal sizing behavior of the child.'),
        verticalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('Vertical sizing behavior of the child.'),
        alignSelf: z.enum(['auto', 'start', 'center', 'end', 'stretch']).optional().describe('Alignment of the child along the cross axis, overriding container alignItems.'),
        topMargin: z.number().optional().describe('Top margin.'),
        rightMargin: z.number().optional().describe('Right margin.'),
        bottomMargin: z.number().optional().describe('Bottom margin.'),
        leftMargin: z.number().optional().describe('Left margin.'),
        horizontalMargin: z.number().optional().describe('Horizontal margin (sets both left and right).'),
        verticalMargin: z.number().optional().describe('Vertical margin (sets both top and bottom).'),
        minWidth: z.number().optional().describe('Minimum width constraint.'),
        maxWidth: z.number().optional().describe('Maximum width constraint.'),
        minHeight: z.number().optional().describe('Minimum height constraint.'),
        maxHeight: z.number().optional().describe('Maximum height constraint.'),
      }).optional().describe('Properties to apply to children of the flex container.'),
    }),
    function: async (args: ConfigureFlexLayoutQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CONFIGURE_FLEX_LAYOUT, args);
      return response;
    },
  },
  {
    id: 'configure-grid-layout',
    name: 'configureGridLayout',
    description: `
      Configures grid layout properties for selected boards.
      Can set container properties (alignment, gaps, padding, sizing),
      define grid structure (rows/columns using flex/fixed/percent/auto tracks),
      and configure child properties (placement in rows/columns, spans, alignment).
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional().describe('Optional list of shape IDs to apply the layout to. If omitted, applies to current selection.'),
      remove: z.boolean().optional().describe('If true, removes the grid layout from the container.'),
      
      // Container Props
      alignItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('Alignment of items in their cells.'),
      alignContent: z.enum(['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('Alignment of the grid within the container.'),
      justifyItems: z.enum(['start', 'end', 'center', 'stretch']).optional().describe('Justification of items in their cells.'),
      justifyContent: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly', 'stretch']).optional().describe('Justification of the grid within the container.'),
      rowGap: z.number().optional().describe('Gap between rows.'),
      columnGap: z.number().optional().describe('Gap between columns.'),
      topPadding: z.number().optional().describe('Top padding.'),
      rightPadding: z.number().optional().describe('Right padding.'),
      bottomPadding: z.number().optional().describe('Bottom padding.'),
      leftPadding: z.number().optional().describe('Left padding.'),
      horizontalPadding: z.number().optional().describe('Horizontal padding (sets both left and right).'),
      verticalPadding: z.number().optional().describe('Vertical padding (sets both top and bottom).'),
      horizontalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('Horizontal sizing behavior of the container.'),
      verticalSizing: z.enum(['fit-content', 'fill', 'auto']).optional().describe('Vertical sizing behavior of the container.'),

      // Grid Structure
      rows: z.array(z.object({
        type: z.enum(['flex', 'fixed', 'percent', 'auto']),
        value: z.number().nullable(),
      })).optional().describe('Set all rows. Overwrites existing rows.'),
      columns: z.array(z.object({
        type: z.enum(['flex', 'fixed', 'percent', 'auto']),
        value: z.number().nullable(),
      })).optional().describe('Set all columns. Overwrites existing columns.'),
      
      addRows: z.array(z.object({
        type: z.enum(['flex', 'fixed', 'percent', 'auto']),
        value: z.number().nullable(),
        index: z.number().optional(),
      })).optional().describe('Add specific rows.'),
      addColumns: z.array(z.object({
        type: z.enum(['flex', 'fixed', 'percent', 'auto']),
        value: z.number().nullable(),
        index: z.number().optional(),
      })).optional().describe('Add specific columns.'),
      
      removeRowIndices: z.array(z.number()).optional().describe('Indices of rows to remove.'),
      removeColumnIndices: z.array(z.number()).optional().describe('Indices of columns to remove.'),

      // Child Props
      childProperties: z.object({
        shapeIds: z.array(z.string()).optional().describe('Specific children to modify. If omitted, applies to all children.'),
        absolute: z.boolean().optional().describe('If true, positions the child absolutely within the container.'),
        zIndex: z.number().optional().describe('Z-index of the child.'),
        horizontalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('Horizontal sizing behavior of the child.'),
        verticalSizing: z.enum(['auto', 'fill', 'fix']).optional().describe('Vertical sizing behavior of the child.'),
        alignSelf: z.enum(['auto', 'start', 'center', 'end', 'stretch']).optional().describe('Alignment of the child along the cross axis.'),
        justifySelf: z.enum(['auto', 'start', 'center', 'end', 'stretch']).optional().describe('Justification of the child along the main axis.'),
        
        topMargin: z.number().optional(),
        rightMargin: z.number().optional(),
        bottomMargin: z.number().optional(),
        leftMargin: z.number().optional(),
        horizontalMargin: z.number().optional(),
        verticalMargin: z.number().optional(),
        
        minWidth: z.number().optional(),
        maxWidth: z.number().optional(),
        minHeight: z.number().optional(),
        maxHeight: z.number().optional(),

        // Grid Cell Props
        row: z.number().optional().describe('Row index to place the child in.'),
        column: z.number().optional().describe('Column index to place the child in.'),
        rowSpan: z.number().optional().describe('Number of rows the child should span.'),
        columnSpan: z.number().optional().describe('Number of columns the child should span.'),
      }).optional().describe('Properties to apply to children of the grid container.'),
    }),
    function: async (args: ConfigureGridLayoutQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CONFIGURE_GRID_LAYOUT, args);
      return response;
    },
  },
  {
    id: 'configure-ruler-guides',
    name: 'configureRulerGuides',
    description: `
      Configures **Ruler Guides** (thin blue/red lines dragged from rulers) for the page or selected boards.
      **Default tool for "add guide" or "create guide" commands.**
      **Does NOT affect Layout Grids (columns/rows overlays).**
      Can add or remove ruler guides at specific positions.
    `,
    inputSchema: z.object({
      scope: z.enum(['page', 'board']).describe('Scope of the guides. "page" applies to the current page. "board" applies to selected boards.'),
      shapeIds: z.array(z.string()).optional().describe('List of board IDs if scope is "board". If omitted and scope is "board", applies to current selection.'),
      
      addGuides: z.array(z.object({
        orientation: z.enum(['horizontal', 'vertical']),
        position: z.number(),
      })).optional().describe('List of guides to add.'),
      
      removeGuides: z.array(z.object({
        orientation: z.enum(['horizontal', 'vertical']),
        position: z.number(),
      })).optional().describe('List of guides to remove. Matches by orientation and position.'),
      
      removeAll: z.boolean().optional().describe('If true, removes all guides in the specified scope.'),
    }),
    function: async (args: ConfigureRulerGuidesQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CONFIGURE_RULER_GUIDES, args);
      return response;
    },
  },
  {
    id: 'configure-board-guides',
    name: 'configureBoardGuides',
    description: `
      Configures **Board Layout Guides** (Column Grids, Row Grids, Square Grids) for selected boards.
      These are the **red/colored overlays** used for alignment.
      Use this to add, set, or **clear/remove** column/row grids.
      
      *For debugging info, see: docs/LAYOUT_TOOLS_INFO_AND_DEBUG.MD*
    `,
    inputSchema: z.object({
      shapeIds: z.array(z.string()).optional().describe('Board IDs to configure. If omitted, applies to current selection.'),
      
      action: z.enum(['set', 'add', 'clear']).describe('Action to perform. "set" replaces all guides, "add" appends guides, "clear" removes all guides.'),
      
      guides: z.array(z.object({
        type: z.enum(['column', 'row', 'square']).describe('Type of guide.'),
        display: z.boolean().optional().describe('Whether the guide is visible.'),
        color: z.string().optional().describe('Color of the guide (hex format).'),
        
        // Column/Row specific
        count: z.number().optional().describe('Number of columns/rows to create. If specified, the plugin will calculate the size automatically based on board dimensions.'),
        alignment: z.enum(['stretch', 'left', 'center', 'right']).optional().describe('Alignment for column/row guides.'),
        size: z.number().optional().describe('Size (width for columns, height for rows). For N-column grids, calculate: size = (boardWidth - 2*margin - (N-1)*gutter) / N. Alternatively, use the count property.'),
        margin: z.number().optional().describe('Margin around the guide area.'),
        itemLength: z.number().optional().describe('DEPRECATED: Length of each individual item within the guide. This is NOT the number of columns/rows.'),
        gutter: z.number().optional().describe('Gutter (spacing) between guide items.'),
      })).optional().describe('List of guides to set or add. Required for "set" and "add" actions.'),
    }),
    function: async (args: ConfigureBoardGuidesQueryPayload) => {
      const response = await sendMessageToPlugin(ClientQueryType.CONFIGURE_BOARD_GUIDES, args);
      return response;
    },
  },
  {
    id: "get-current-theme",
    name: "getCurrentTheme",
    description: `
      Use this tool to get the current Penpot theme (light or dark mode).
      Returns the current theme setting.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_THEME, undefined);
      return response;
    },
  },
  {
    id: "get-file-versions",
    name: "getFileVersions",
    description: `
      Use this tool to get the version history of the current Penpot file.
      It returns all versions including their labels, IDs, and whether they are autosaves.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_FILE_VERSIONS, undefined);
      return response;
    },
  },
];


