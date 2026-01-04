import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
} from '../types/types';

const pluginResponse = {
  source: MessageSourceName.Plugin,
  type: ClientQueryType.ADD_IMAGE,
  messageId: '',
  message: '',
  success: true,
};

export function handleGetUserData() {
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
    }
  }
}

export function handleGetProjectData() {
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

export function getAvailableFonts() {
  return {
    ...pluginResponse,
    type: ClientQueryType.GET_AVAILABLE_FONTS,
    message: 'Available fonts successfully retrieved',
    payload: {
      fonts: penpot.fonts.all.map((font) => font.name),
    },
  };
}

function extractShapeData(shape) {
  // Para el board root frame, solo enviar name, type e id
  if (shape.type === 'board' && shape.parent === null) {
    return {
      id: shape.id,
      name: shape.name,
      type: shape.type,
    };
  }

  const shapeData = {
    ...shape,
  };

  // Add parentId if parent exists (avoid circular reference)
  if (shape.parent) {
    shapeData.parent = shape.parent.id;
  }

  // Add type-specific properties

  return shapeData;
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
  const serializedShapes = componentShapes.map(extractShapeData);

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
  const serializedShapes = shapes.map(extractShapeData);

  // Obtener componentes de la librería local únicamente
  const localComponents = penpot.library?.local?.components || [];
  const localComponentsData = localComponents.map(extractComponentData);

  // Eliminar duplicados por ID
  const uniqueComponents = localComponentsData.filter((component, index, self) =>
    index === self.findIndex((c) => c.id === component.id)
  );

  return {
    ...pluginResponse,
    type: ClientQueryType.GET_CURRENT_PAGE,
    message: 'Current page successfully retrieved',
    payload: {
      name: penpot.currentPage?.name || '',
      id: penpot.currentPage?.id || '',
      shapes: serializedShapes,
      components: uniqueComponents,
    },
  };
}

export async function handleAddImage(payload) {
  const { name, data, mimeType } = payload;

  try {
    const imageCreatedData = await penpot.uploadMediaData(name, data, mimeType);
    if (imageCreatedData) {
      return {
        ...pluginResponse,
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
      ...pluginResponse,
      success: false,
      message: `error adding image ${name}: ${error}`,
    }
  }
}

