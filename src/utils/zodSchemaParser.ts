import { toJSONSchema } from "zod";

/**
 * Convert a Zod schema to JSON Schema format
 * Uses Zod's built-in toJSONSchema method which includes descriptions
 */
export function parseZodSchema(zodSchema: any): any {
  if (!zodSchema) {
    return null;
  }

  try {
    return toJSONSchema(zodSchema);
  } catch (error) {
    console.error('Error converting Zod schema to JSON Schema:', error);
    return null;
  }
}

