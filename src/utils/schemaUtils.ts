/**
 * Utility functions for converting and rendering Zod schemas
 */

interface SchemaField {
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: unknown;
}

interface SchemaObject {
  [key: string]: SchemaField;
}

/**
 * Helper function to convert Zod schema to JavaScript object
 */
export const convertZodSchemaToJS = (zodSchema: unknown): SchemaObject | null => {
  try {
    if (!zodSchema) return null;
    
    // Get the shape of the Zod schema
    const shape = (zodSchema as { shape: Record<string, unknown> }).shape;
    
    // Convert shape to JavaScript object
    const jsObject: SchemaObject = {};
    Object.keys(shape).forEach(key => {
      const field = shape[key] as {
        type: string;
        description?: string;
        isOptional: () => boolean;
        _def: { defaultValue?: () => unknown };
      };
      jsObject[key] = {
        type: field.type,
        description: field.description || '',
        optional: field.isOptional(),
        defaultValue: field._def.defaultValue?.() || undefined,
        // Add more properties as needed
      };
    });
    
    return jsObject;
  } catch (error) {
    console.error('Error converting Zod schema to JS object:', error);
    return null;
  }
};

/**
 * Helper function to render schema as formatted string
 */
export const renderSchemaAsString = (schemaObject: SchemaObject | null): string => {
  if (!schemaObject) return 'No schema defined';
  
  const lines: string[] = [];
  Object.keys(schemaObject).forEach(key => {
    const field = schemaObject[key];
    const optional = field.optional ? '?' : '';
    const defaultValue = field.defaultValue !== undefined ? ` = ${JSON.stringify(field.defaultValue)}` : '';
    const description = field.description ? ` // ${field.description}` : '';
    
    lines.push(`  ${key}${optional}: ${field.type}${defaultValue}${description}`);
  });
  
  return lines.join('\n');
};
