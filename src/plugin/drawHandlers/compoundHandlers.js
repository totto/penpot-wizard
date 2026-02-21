import { curateShapeOutput } from '../utils';
import { PenpotShapeType } from '../../types/types';
import { setParamsToShape } from './helpers';

const BOOLEAN_TYPES = ['union', 'difference', 'exclude', 'intersection'];

export function handleCreateGroup(payload) {
  const { shapeIds, ...properties } = payload || {};

  try {
    const group = penpot.group(
      (shapeIds || []).map((shapeId) => penpot.currentPage?.getShapeById(shapeId))
    );

    if (!group) {
      throw new Error('Failed to create group');
    }

    setParamsToShape(group, properties);

    return {
      success: true,
      message: 'Group created successfully',
      payload: {
        group: curateShapeOutput(group),
        shapes: Array.isArray(shapeIds)
          ? shapeIds.map((shapeRef) => {
              const shapeId = typeof shapeRef === 'string' ? shapeRef : shapeRef.shapeId;
              const shape = penpot.currentPage?.getShapeById(shapeId);
              return shape ? curateShapeOutput(shape) : { id: shapeId };
            })
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `error creating group: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateBoolean(payload) {
  const { boolType, shapeIds, ...params } = payload || {};

  try {
    if (!BOOLEAN_TYPES.includes(boolType)) {
      throw new Error(`Invalid boolType. Must be one of: ${BOOLEAN_TYPES.join(', ')}`);
    }
    if (!shapeIds || !Array.isArray(shapeIds) || shapeIds.length < 2) {
      throw new Error('At least 2 shape IDs are required for boolean operation');
    }

    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });

    const booleanShape = penpot.createBoolean(boolType, shapes);
    if (!booleanShape) {
      throw new Error(`Failed to create boolean shape (${boolType})`);
    }

    if (params && Object.keys(params).length > 0) {
      setParamsToShape(booleanShape, params);
    }

    return {
      success: true,
      message: `Boolean shape (${boolType}) created successfully`,
      payload: {
        shape: curateShapeOutput(booleanShape),
      },
    };
  } catch (error) {
    console.error('error creating boolean shape:', error);
    return {
      success: false,
      message: `error creating boolean shape: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleUngroupShape(payload) {
  const { groupId } = payload || {};

  try {
    const group = penpot.currentPage?.getShapeById(groupId);
    if (!group) {
      throw new Error(`Shape with ID ${groupId} not found`);
    }
    if (group.type !== PenpotShapeType.GROUP) {
      throw new Error(
        `Shape with ID ${groupId} is not a group. Use this tool only for groups.`
      );
    }

    penpot.ungroup(group);

    return {
      success: true,
      message: 'Group ungrouped successfully',
      payload: {
        groupId,
        ungrouped: true,
      },
    };
  } catch (error) {
    console.error('error ungrouping shape:', error);
    return {
      success: false,
      message: `error ungrouping group ${groupId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
