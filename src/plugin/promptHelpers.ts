import type { Shape } from '@penpot/plugin-types';
import type {
  SelectionBlockerType,
  SelectionConfirmationPromptPayload,
} from '../types/pluginTypes';

export interface SelectionBlockerInfo {
  blockerType: SelectionBlockerType;
  blockerDetails: string;
  blockedShapeIds: string[];
  blockedShapeNames: string[];
}

const blockerDefaults: Record<SelectionBlockerType, string> = {
  locked: 'One or more selected items are locked and cannot be modified right now.',
  readOnly: 'Some selected items are read-only (layers, boards, or rendered content) and cannot be changed yet.',
  unsupportedType: 'Some of the selected items are unsupported by this tool at the moment.',
  apiError: 'Penpot reported an error while inspecting your shapes.',
  unknown: 'I cannot safely modify this selection right now.',
};

function summarizeShape(shape: Shape) {
  return shape.name || shape.id;
}

/**
 * Inspect the selection and return the strongest blocker that applies so the
 * calling tool can stop and prompt for confirmation.
 */
export function detectSelectionBlocker(selection: Shape[], fallbackReason?: string): SelectionBlockerInfo | null {
  if (!selection || selection.length === 0) {
    return null;
  }

  const lockedShapes = selection.filter((shape) => Boolean((shape as { locked?: boolean }).locked));
  if (lockedShapes.length > 0) {
    return {
      blockerType: 'locked',
      blockerDetails: fallbackReason ?? blockerDefaults.locked,
      blockedShapeIds: lockedShapes.map((shape) => shape.id),
      blockedShapeNames: lockedShapes.map(summarizeShape),
    };
  }

  const readOnlyShapes = selection.filter((shape) =>
    Boolean((shape as { readOnly?: boolean }).readOnly) || Boolean((shape as { readonly?: boolean }).readonly)
  );
  if (readOnlyShapes.length > 0) {
    return {
      blockerType: 'readOnly',
      blockerDetails: fallbackReason ?? blockerDefaults.readOnly,
      blockedShapeIds: readOnlyShapes.map((shape) => shape.id),
      blockedShapeNames: readOnlyShapes.map(summarizeShape),
    };
  }

  if (fallbackReason) {
    return {
      blockerType: 'unknown',
      blockerDetails: fallbackReason,
      blockedShapeIds: selection.map((shape) => shape.id),
      blockedShapeNames: selection.map(summarizeShape),
    };
  }

  return null;
}

/**
 * Build a shared confirmation prompt that describes the blocker, defaults,
 * and next steps. We will reuse this template across the set-selection-* tools
 * once their workflows are wired up.
 */
export function buildSelectionConfirmationPrompt(options: {
  actionName: string;
  blockerInfo: SelectionBlockerInfo;
  defaultsText?: string;
  examples?: string[];
  suggestion?: string;
}): SelectionConfirmationPromptPayload {
  const { actionName, blockerInfo, defaultsText, examples, suggestion } = options;
  const messageSections = [
    `I can't ${actionName} because ${blockerInfo.blockerDetails}`,
    defaultsText ? `Defaults: ${defaultsText}` : undefined,
    examples && examples.length > 0 ? `Examples:
${examples.map((example) => `• ${example}`).join('\n')}` : undefined,
    suggestion ?? 'Please confirm or update the selection before I continue.',
  ].filter(Boolean);

  return {
    actionName,
    message: messageSections.join('\n\n'),
    defaultsText,
    examples,
    blockerType: blockerInfo.blockerType,
    blockerDetails: blockerInfo.blockerDetails,
    blockedShapeIds: blockerInfo.blockedShapeIds,
    blockedShapeNames: blockerInfo.blockedShapeNames,
    needsConfirmation: true,
    suggestion,
  };
}
