import { pathCommandsToSvgString } from '../utils';
import { PenpotShapeType } from '../../types/types';
import { applyTokensToShape } from './tokenHandlers';

export function setParamsToShape(shape, params) {
  const { parentX, parentY, parentId, parentIndex, width, height, layoutChild, layoutCell, tokens, ...rest } = params;

  Object.keys(rest).forEach((key) => {
    shape[key] = rest[key];
  });

  if (width || height) {
    shape.resize(width ?? shape.width, height ?? shape.height);
  }

  if (parentId) {
    const parentShape = penpot.currentPage?.getShapeById(parentId) || penpot.currentPage?.root;

    const insertIndex =
      typeof parentIndex === 'number' ? parentIndex : (parentShape.children?.length ?? 0);

    parentShape.insertChild(insertIndex, shape);
  } else if (parentIndex !== undefined) {
    shape.setParentIndex(parentIndex);
  }

  const parent = shape.parent;

  if (layoutCell) {
    if (parent && parent.grid) {
      parent.grid.appendChild(shape, layoutCell.row, layoutCell.column);
      Object.keys(layoutCell).forEach((key) => {
        if (layoutCell[key] !== undefined) {
          shape.layoutCell[key] = layoutCell[key];
        }
      });
    }
  }

  if (layoutChild) {
    if (parent && shape.layoutChild) {
      if (layoutChild.zIndex !== undefined) {
        shape.setParentIndex(layoutChild.zIndex);
      }
      if (parent.flex) {
        parent.flex.appendChild(shape);
      }
      Object.keys(layoutChild).forEach((key) => {
        if (layoutChild[key] === 'auto') {
          shape.layoutChild[key] = null;
        } else if (layoutChild[key] && key !== 'zIndex') {
          shape.layoutChild[key] = layoutChild[key];
        }
      });
    }
  }

  if (parent && (layoutChild?.zIndex || parentIndex)) {
    if (parent.children.length < (layoutChild?.zIndex || parentIndex)) {
      shape.setPluginData('zIndex', (layoutChild?.zIndex || parentIndex).toString());
      console.log('add zindex to plugindata: ', shape.getPluginData('zIndex'), shape);
    }
  }

  if (parent) {
    parent.children.forEach((child) => {
      if (child.getPluginData('zIndex') !== '' && child.getPluginData('zIndex') !== null) {
        child.setParentIndex(child.getPluginData('zIndex'));
      }
    });
  }

  if (parentX !== undefined) {
    shape.parentX = parentX;
  }
  if (parentY !== undefined) {
    shape.parentY = parentY;
  }

  if (tokens) {
    applyTokensToShape(shape, tokens);
  }
}

export function setParamsToBoard(board, params) {
  const { flex, grid, boardHorizontalSizing, boardVerticalSizing, ...rest } = params;
  const shape = board;

  if (flex) {
    const flexLayout = shape.addFlexLayout();
    const { layoutHorizontalSizing, layoutVerticalSizing, ...flexProps } = flex;
    Object.keys(flexProps).forEach((key) => {
      flexLayout[key] = flexProps[key];
    });
    if (layoutHorizontalSizing !== undefined) flexLayout.horizontalSizing = layoutHorizontalSizing;
    if (layoutVerticalSizing !== undefined) flexLayout.verticalSizing = layoutVerticalSizing;
  }

  if (grid) {
    const { rows, columns, layoutHorizontalSizing, layoutVerticalSizing, ...gridProps } = grid;
    const gridLayout = shape.addGridLayout();
    Object.keys(gridProps).forEach((key) => {
      if (gridProps[key] !== undefined) {
        gridLayout[key] = gridProps[key];
      }
      if (layoutHorizontalSizing !== undefined) gridLayout.horizontalSizing = layoutHorizontalSizing;
      if (layoutVerticalSizing !== undefined) gridLayout.verticalSizing = layoutVerticalSizing;
    });
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        gridLayout.addRow(row.type, row.value);
      });
    }
    if (Array.isArray(columns)) {
      columns.forEach((column) => {
        gridLayout.addColumn(column.type, column.value);
      });
    }
  }

  if (boardHorizontalSizing !== undefined) shape.horizontalSizing = boardHorizontalSizing;
  if (boardVerticalSizing !== undefined) shape.verticalSizing = boardVerticalSizing;

  setParamsToShape(shape, rest);
}

export function applyModifyParamsToShape(shape, params = {}, paramsToRemove = []) {
  if (!params || typeof params !== 'object') {
    return shape;
  }

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null)
  );

  (paramsToRemove || []).forEach((key) => {
    switch (key) {
      case 'fills':
        shape.fills = [];
        break;
      case 'strokes':
        shape.strokes = [];
        break;
      case 'shadows':
        shape.shadows = [];
        break;
      case 'blur':
        delete shape.blur;
        break;
      case 'grid':
        if (shape.grid?.remove) {
          shape.grid.remove();
        }
        break;
      case 'flex':
        if (shape.flex?.remove) {
          shape.flex.remove();
        }
        break;
      case 'interactions':
        while (shape.interactions?.length > 0) {
          shape.removeInteraction(shape.interactions[0]);
        }
        break;
      default:
        break;
    }
  });

  if (filteredParams.content && shape.type === PenpotShapeType.PATH) {
    filteredParams.content = pathCommandsToSvgString(filteredParams.content);
  }

  Object.keys(filteredParams).forEach((key) => {
    if (key === 'grid' && shape.grid) {
      const { rows, columns, ...gridProps } = filteredParams.grid;
      Object.keys(gridProps).forEach((gridKey) => {
        if (gridProps[gridKey] !== undefined) {
          shape.grid[gridKey] = gridProps[gridKey];
        }
      });
      if (Array.isArray(rows)) {
        rows.forEach((row, index) => {
          shape.grid.setRow(index, row.type, row.value);
        });
      }
      if (Array.isArray(columns)) {
        columns.forEach((column, index) => {
          shape.grid.setColumn(index, column.type, column.value);
        });
      }
      delete filteredParams.grid;
    } else if (key === 'flex' && shape.flex) {
      Object.keys(filteredParams.flex).forEach((flexKey) => {
        if (filteredParams.flex[flexKey] !== undefined) {
          shape.flex[flexKey] = filteredParams.flex[flexKey];
        }
      });
      delete filteredParams.flex;
    }
  });

  if (shape.type === PenpotShapeType.BOARD) {
    setParamsToBoard(shape, filteredParams);
    return shape;
  }
  setParamsToShape(shape, filteredParams);
  return shape;
}
