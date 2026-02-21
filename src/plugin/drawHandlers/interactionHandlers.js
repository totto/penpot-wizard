import { PenpotShapeType } from '../../types/types';

function buildAnimation(anim) {
  if (!anim) return undefined;
  const base = { duration: anim.duration || 300, easing: anim.easing || 'linear' };
  if (anim.type === 'dissolve') {
    return { type: 'dissolve', ...base };
  }
  if (anim.type === 'slide') {
    return {
      type: 'slide',
      way: anim.way || 'out',
      direction: anim.direction || 'right',
      ...base,
      offsetEffect: anim.offsetEffect,
    };
  }
  if (anim.type === 'push') {
    return {
      type: 'push',
      direction: anim.direction || 'right',
      ...base,
    };
  }
  return { type: 'dissolve', duration: 300, easing: 'linear' };
}

function buildAction(payload) {
  const action = payload.action;
  const page = penpot.currentPage;

  if (action.type === 'navigate-to') {
    const destination = page?.getShapeById(action.destinationBoardId);
    if (!destination || destination.type !== PenpotShapeType.BOARD) {
      throw new Error(`Board with ID ${action.destinationBoardId} not found`);
    }
    const a = { type: 'navigate-to', destination };
    if (action.preserveScrollPosition !== undefined) a.preserveScrollPosition = action.preserveScrollPosition;
    if (action.animation) a.animation = buildAnimation(action.animation);
    return a;
  }

  if (action.type === 'open-overlay' || action.type === 'toggle-overlay') {
    const destination = page?.getShapeById(action.destinationBoardId);

    if (!destination || destination.type !== PenpotShapeType.BOARD) {
      throw new Error(`Board with ID ${action.destinationBoardId} not found`);
    }

    const a = {
      type: action.type,
      destination,
      position: action.position || 'center',
      manualPositionLocation:
        action.position === 'manual' && action.manualPositionLocation
          ? action.manualPositionLocation
          : { x: 0, y: 0 },
    };

    if (action.relativeToShapeId) {
      const rel = page?.getShapeById(action.relativeToShapeId);
      if (rel) a.relativeTo = rel;
    }

    if (action.closeWhenClickOutside !== undefined)
      a.closeWhenClickOutside = action.closeWhenClickOutside;
    if (action.addBackgroundOverlay !== undefined)
      a.addBackgroundOverlay = action.addBackgroundOverlay;
    if (action.animation) a.animation = buildAnimation(action.animation);
    return a;
  }

  if (action.type === 'close-overlay') {
    const a = {
      type: 'close-overlay',
      animation: buildAnimation(action.animation) || {
        type: 'dissolve',
        duration: 300,
        easing: 'linear',
      },
    };
    if (action.destinationBoardId) {
      const destination = page?.getShapeById(action.destinationBoardId);
      if (destination) a.destination = destination;
    }
    return a;
  }

  if (action.type === 'previous-screen') {
    return { type: 'previous-screen' };
  }

  if (action.type === 'open-url') {
    return { type: 'open-url', url: action.url };
  }

  throw new Error(`Unknown action type: ${action?.type}`);
}

export function handleAddInteraction(payload) {
  const { shapeId, trigger, delay, action } = payload || {};

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    const builtAction = buildAction(payload);
    const delayMs = trigger === 'after-delay' ? (delay ?? 0) : undefined;

    shape.addInteraction(trigger, builtAction, delayMs);

    return {
      success: true,
      message: `Interaction added (${trigger} -> ${action?.type})`,
      payload: {
        shapeId,
        trigger,
        actionType: action?.type,
      },
    };
  } catch (error) {
    console.error('error adding interaction:', error);
    return {
      success: false,
      message: `error adding interaction: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateFlow(payload) {
  const { name, boardId } = payload || {};

  try {
    const board = penpot.currentPage?.getShapeById(boardId);
    if (!board) {
      throw new Error(`Board with ID ${boardId} not found`);
    }
    if (board.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${boardId} is not a board`);
    }

    const flow = penpot.currentPage.createFlow(name, board);

    return {
      success: true,
      message: `Flow "${name}" created successfully`,
      payload: {
        flowName: flow.name,
        startingBoardId: board.id,
      },
    };
  } catch (error) {
    console.error('error creating flow:', error);
    return {
      success: false,
      message: `error creating flow: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleRemoveFlow(payload) {
  const { flowName } = payload || {};

  try {
    const flow = penpot.currentPage?.flows?.find((f) => f.name === flowName);
    if (!flow) {
      throw new Error(`Flow with name "${flowName}" not found`);
    }

    penpot.currentPage.removeFlow(flow);

    return {
      success: true,
      message: `Flow "${flowName}" removed successfully`,
      payload: {
        flowName,
        removed: true,
      },
    };
  } catch (error) {
    console.error('error removing flow:', error);
    return {
      success: false,
      message: `error removing flow: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
