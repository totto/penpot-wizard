/**
 * Schema AST (Abstract Syntax Tree)
 * Intermediate representation for schemas that can be converted to/from Zod and TypeScript
 */

export type SchemaType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date'
  | 'bigint'
  | 'object' 
  | 'array' 
  | 'enum'
  | 'literal'
  | 'union'
  | 'any'
  | 'unknown'
  | 'null'
  | 'undefined'
  | 'void';

export interface SchemaAST {
  type: SchemaType;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  defaultValue?: unknown;
  
  // For objects
  properties?: Record<string, SchemaAST>;
  
  // For arrays
  items?: SchemaAST;
  
  // For enums
  enum?: (string | number)[];
  
  // For literals
  literal?: unknown;
  
  // For unions
  union?: SchemaAST[];
}

