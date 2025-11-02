/**
 * Converts Zod schemas to AST representation (recursively)
 */

import type { SchemaAST } from './schemaAST';

/**
 * Extract description from a Zod v4 schema
 * In Zod v4, .describe() adds a description property directly to the schema object
 */
function extractDescription(schema: any): string | undefined {
  // Zod v4 stores description as a direct property on the schema object
  if (schema.description !== undefined && schema.description !== null) {
    return schema.description;
  }
  
  // Fallback: check in def
  const def = schema.def;
  if (def?.description) {
    return def.description;
  }
  
  return undefined;
}

/**
 * Main function to convert a Zod v4 schema to AST
 */
export function zodSchemaToAST(zodSchema: unknown): SchemaAST {
  if (!zodSchema || typeof zodSchema !== 'object') {
    return { type: 'unknown' };
  }

  const schema = zodSchema as any;
  const def = schema.def;
  
  if (!def) {
    console.warn('Schema without def:', zodSchema);
    return { type: 'unknown' };
  }

  const typeName = def.type || schema.type;

  if (!typeName) {
    console.warn('Schema without typeName:', zodSchema);
    return { type: 'unknown' };
  }

  // Extract description
  const description = extractDescription(schema);

  // Handle different Zod v4 types
  switch (typeName) {
    case 'string':
      return { type: 'string', description };

    case 'number':
      return { type: 'number', description };

    case 'boolean':
      return { type: 'boolean', description };

    case 'date':
      return { type: 'date', description };

    case 'bigint':
      return { type: 'bigint', description };

    case 'any':
      return { type: 'any', description };

    case 'unknown':
      return { type: 'unknown', description };

    case 'null':
      return { type: 'null', description };

    case 'undefined':
      return { type: 'undefined', description };

    case 'void':
      return { type: 'void', description };

    case 'object':
      return zodObjectToAST(schema, description);

    case 'array':
      return zodArrayToAST(schema, description);

    case 'enum':
      return zodEnumToAST(schema, description);

    case 'native-enum':
      return zodNativeEnumToAST(schema, description);

    case 'literal':
      return zodLiteralToAST(schema, description);

    case 'union':
      return zodUnionToAST(schema, description);

    case 'optional':
      return zodOptionalToAST(schema);

    case 'nullable':
      return zodNullableToAST(schema);

    case 'default':
      return zodDefaultToAST(schema);

    default:
      console.warn(`Unsupported Zod type: ${typeName}`);
      return { 
        type: 'unknown', 
        description: description || `Unsupported type: ${typeName}` 
      };
  }
}

/**
 * Convert ZodObject to AST (recursive)
 */
function zodObjectToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  // shape can be a function (getter) or a direct object
  let shape = def?.shape;
  if (typeof shape === 'function') {
    shape = shape();
  }
  shape = shape || {};
  
  const properties: Record<string, SchemaAST> = {};

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = zodSchemaToAST(value); // RECURSION
  }

  return {
    type: 'object',
    description,
    properties
  };
}

/**
 * Convert ZodArray to AST (recursive)
 */
function zodArrayToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  const itemType = def?.type;
  
  // For Zod v4, if def.type is a string (like 'array'), the actual item schema is nested
  let actualItemType = itemType;
  if (typeof itemType === 'string') {
    // Try to get the nested item type from the schema structure
    actualItemType = schema.element || def?.items;
  }
  
  return {
    type: 'array',
    description,
    items: zodSchemaToAST(actualItemType) // RECURSION
  };
}

/**
 * Convert ZodEnum to AST
 */
function zodEnumToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  // Zod v4 uses `entries` object
  const entries = def?.entries;
  const values = entries ? Object.values(entries) : [];
  
  return {
    type: 'enum',
    description,
    enum: values as (string | number)[]
  };
}

/**
 * Convert ZodNativeEnum to AST
 */
function zodNativeEnumToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  const enumObject = def?.values || {};
  const values = Object.values(enumObject).filter(
    value => typeof value === 'string' || typeof value === 'number'
  ) as (string | number)[];
  
  return {
    type: 'enum',
    description,
    enum: values
  };
}

/**
 * Convert ZodLiteral to AST
 */
function zodLiteralToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  // Zod v4 uses `values` array with single value
  const value = def?.values?.[0];
  
  return {
    type: 'literal',
    description,
    literal: value
  };
}

/**
 * Convert ZodUnion to AST (recursive)
 */
function zodUnionToAST(schema: any, description?: string): SchemaAST {
  const def = schema.def;
  const options = def?.options || [];
  
  return {
    type: 'union',
    description,
    union: options.map((option: any) => zodSchemaToAST(option)) // RECURSION
  };
}

/**
 * Convert ZodOptional to AST (unwrap and mark as optional)
 */
function zodOptionalToAST(schema: any): SchemaAST {
  const def = schema.def;
  const innerType = def?.innerType || def?.schema;
  const innerAST = zodSchemaToAST(innerType); // RECURSION
  
  // Check if the optional wrapper has a description
  const wrapperDescription = extractDescription(schema);
  
  return {
    ...innerAST,
    optional: true,
    // Use wrapper description if available, otherwise keep inner description
    description: wrapperDescription || innerAST.description
  };
}

/**
 * Convert ZodNullable to AST (unwrap and mark as nullable)
 */
function zodNullableToAST(schema: any): SchemaAST {
  const def = schema.def;
  const innerType = def?.innerType || def?.schema;
  const innerAST = zodSchemaToAST(innerType); // RECURSION
  
  // Check if the nullable wrapper has a description
  const wrapperDescription = extractDescription(schema);
  
  return {
    ...innerAST,
    nullable: true,
    // Use wrapper description if available, otherwise keep inner description
    description: wrapperDescription || innerAST.description
  };
}

/**
 * Convert ZodDefault to AST (unwrap and add default value)
 */
function zodDefaultToAST(schema: any): SchemaAST {
  const def = schema.def;
  const innerType = def?.innerType || def?.schema;
  // In Zod v4, defaultValue is the actual value, not a function
  const defaultValue = def?.defaultValue;
  const innerAST = zodSchemaToAST(innerType); // RECURSION
  
  return {
    ...innerAST,
    defaultValue
  };
}

