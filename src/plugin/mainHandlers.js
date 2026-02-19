import { curateShapeOutput } from './utils';

export function handleGetUserData() {
  if (penpot.currentUser) {
    return {
      success: true,
      message: 'User data successfully retrieved',
      payload: {
        name: penpot.currentUser.name || '',
        id: penpot.currentUser.id,
      },
    };
  } else {
    return {
      success: false,
      message: 'Error retrieving user data',
      payload: {
        error: 'User data not available',
      },
    }
  }
}

export function handleGetProjectData() {
  if (penpot.currentFile && penpot.currentPage) {
    return {
      success: true,
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
      success: false,
      message: 'Error retrieving project data',
      payload: {
        error: 'Project data not available',
      },
    }
  }
}

function getAllShapesFromComponent(component) {
  const shapes = [];
  
  try {
    const mainInstance = component.mainInstance();
    if (!mainInstance) {
      return shapes;
    }

    // Función recursiva para obtener todos los shapes
    function traverseShape(shape) {
      shapes.push(shape);
      
      // Si el shape tiene hijos, recorrerlos recursivamente
      if ('children' in shape && shape.children) {
        shape.children.forEach(traverseShape);
      }
    }

    traverseShape(mainInstance);
  } catch (error) {
    // Si hay un error al obtener el mainInstance, retornar array vacío
    console.warn(`Error getting shapes from component ${component.id}:`, error);
  }

  return shapes;
}

function extractComponentData(component) {
  // Obtener todos los shapes del componente
  const componentShapes = getAllShapesFromComponent(component);
  const serializedShapes = componentShapes.map(curateShapeOutput);

  return {
    id: component.id,
    libraryId: component.libraryId,
    name: component.name,
    path: component.path,
    shapes: serializedShapes,
  };
}

export function getCurrentPage() {
  const shapes = penpot.currentPage?.findShapes({}) || [];
  const serializedShapes = shapes.map(curateShapeOutput);

  // Obtener componentes de la librería local únicamente
  const localComponents = penpot.library?.local?.components || [];
  const localComponentsData = localComponents.map(extractComponentData);

  // Eliminar duplicados por ID
  const uniqueComponents = localComponentsData.filter((component, index, self) =>
    index === self.findIndex((c) => c.id === component.id)
  );

  const flows = penpot.currentPage?.flows || [];
  const flowsData = flows.map((f) => ({
    name: f.name,
    startingBoardId: f.startingBoard?.id,
  }));

  return {
    success: true,
    message: 'Current page successfully retrieved',
    payload: {
      name: penpot.currentPage?.name || '',
      id: penpot.currentPage?.id || '',
      shapes: serializedShapes,
      components: uniqueComponents,
      flows: flowsData,
    },
  };
}

export function getSelectedShapes() {
  const selection = penpot.selection || penpot.currentPage?.selection || [];
  const selectedShapes = Array.isArray(selection) ? selection : [];
  const selectedShapeIds = selectedShapes
    .map((shape) => shape?.id)
    .filter(Boolean);

  return {
    success: true,
    message: selectedShapeIds.length
      ? 'Selected shapes successfully retrieved'
      : 'No selected shapes found',
    payload: {
      selectedShapeIds,
    },
  };
}

function applyBasicShapeParams(shape, params = {}) {
  const { name, x, y, parentX, parentY, width, height, parentId, zIndex } = params;

  let parent = null;
  if (parentId) {
    parent = penpot.currentPage?.getShapeById(parentId);
  }
  if (!parent) {
    parent = penpot.currentPage?.root || null;
  }
  if (parent) {
    const insertIndex = typeof zIndex === 'number'
      ? zIndex
      : (parent.children?.length ?? 0);
    if (typeof parent.insertChild === 'function') {
      parent.insertChild(insertIndex, shape);
    } else if (typeof parent.appendChild === 'function') {
      parent.appendChild(shape);
    }
  }

  if (name) {
    shape.name = name;
  }

  if (width && height) {
    shape.resize(width, height);
  }

  if (x !== undefined) {
    shape.x = x;
  }
  if (y !== undefined) {
    shape.y = y;
  }
  if (parentX !== undefined) {
    shape.parentX = parentX;
  }
  if (parentY !== undefined) {
    shape.parentY = parentY;
  }
}

export function handleCreateShapeFromSvg(payload) {
  const { svgString, params } = payload || {};

  try {
    if (!svgString || typeof svgString !== 'string') {
      throw new Error('svgString is required');
    }

    const group = penpot.createShapeFromSvg(svgString);
    if (!group) {
      throw new Error('Failed to create shape from SVG');
    }

    applyBasicShapeParams(group, params);

    return {
      success: true,
      message: 'SVG shape created successfully',
      payload: {
        shape: curateShapeOutput(group),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `error creating svg shape: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleGetFonts(payload) {
  const { query, limit = 20 } = payload || {};

  try {
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        message: 'query (string) is required',
        payload: { error: 'Missing or invalid query' },
      };
    }

    const fontsContext = penpot.fonts;
    if (!fontsContext || typeof fontsContext.findAllByName !== 'function') {
      return {
        success: false,
        message: 'Fonts API not available in this Penpot version',
        payload: { error: 'penpot.fonts.findAllByName is not available' },
      };
    }

    const matches = fontsContext.findAllByName(query.trim()) || [];
    const capped = Array.isArray(matches)
      ? matches.slice(0, Math.min(limit, 20))
      : [];

    const fonts = capped.map((f) => ({
      name: f?.name ?? f?.fontFamily ?? '',
      fontId: f?.fontId ?? '',
      fontFamily: f?.fontFamily ?? f?.name ?? '',
    }));

    return {
      success: true,
      message: `Found ${fonts.length} font(s) matching "${query}"`,
      payload: {
        query: query.trim(),
        fonts,
        totalMatches: Array.isArray(matches) ? matches.length : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error searching fonts: ${error?.message || String(error)}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
        query: query || '',
      },
    };
  }
}

export async function handleAddImage(payload) {
  const { name, data, mimeType, url } = payload;

  try {
    let imageCreatedData;
    if (url) {
      imageCreatedData = await penpot.uploadMediaUrl(name || `image-${Date.now()}`, url);
    } else if (data && mimeType) {
      imageCreatedData = await penpot.uploadMediaData(name, data, mimeType);
    } else {
      throw new Error('Provide either url or (data and mimeType)');
    }

    if (imageCreatedData) {
      return {
        success: true,
        message: 'Image added successfully',
        payload: {
          newImageData: imageCreatedData,
        },
      };
    } else {
      throw new Error('error creating image in Penpot');
    }
  } catch (error) {
    return {
      success: false,
      message: `error adding image ${name || 'unknown'}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

