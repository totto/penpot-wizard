import { z } from 'zod';

/** DTCG token types (keys for code, values for Penpot API) */
export const TOKEN_TYPES = {
  COLOR: 'color',
  SPACING: 'spacing',
  DIMENSION: 'dimension',
  FONT_SIZES: 'fontSizes',
  FONT_FAMILIES: 'fontFamilies',
  FONT_WEIGHTS: 'fontWeights',
  LETTER_SPACING: 'letterSpacing',
  OPACITY: 'opacity',
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  BORDER_WIDTH: 'borderWidth',
  ROTATION: 'rotation',
  TEXT_CASE: 'textCase',
  TEXT_DECORATION: 'textDecoration',
  SIZING: 'sizing',
};

const allTokenTypes = /** @type {[string, ...string[]]} */ (Object.values(TOKEN_TYPES));

export const tokenSchema = z.object({
  type: z.enum(allTokenTypes).describe(
    `Token type. One of: ${allTokenTypes.join(', ')}`
  ),
  name: z.string().min(1).describe(
    'Token name using dots for nesting (e.g. "brand.primary", "spacing.sm"). '
    + 'Must match: ^[a-zA-Z0-9_-][a-zA-Z0-9$_-]*(\\.[a-zA-Z0-9$_-]+)*$'
  ),
  value: z.union([z.string(), z.number(), z.boolean()]).describe(
    'Token value. Use string for colors (e.g. "#6366F1"), '
    + 'number for spacing/dimensions/sizes/opacity/rotation/etc, '
    + 'boolean for boolean tokens, '
    + 'string for font families and string tokens.'
  ),
}).describe('A single design token object with type, name, and value properties.');

/** Shape attributes that Penpot accepts for token application. */
export const TOKEN_ATTRS = [
  'fill', 'stroke-color',
  'r1', 'r2', 'r3', 'r4',
  'shadow',
  'stroke-width',
  'width', 'height',
  'layout-item-min-w', 'layout-item-max-w', 'layout-item-min-h', 'layout-item-max-h',
  'opacity',
  'row-gap', 'column-gap',
  'p1', 'p2', 'p3', 'p4',
  'm1', 'm2', 'm3', 'm4',
  'x', 'y',
  'rotation',
  'font-size', 'letter-spacing', 'font-family', 'font-weight',
  'text-case', 'text-decoration', 'typography',
  'line-height',
];

const tokenAttrEnum = /** @type {[string, ...string[]]} */ (TOKEN_ATTRS);

const tokenAssignmentSchema = z.object({
  tokenName: z.string().min(1).describe('Name of the token to apply (e.g. "brand.primary")'),
  attr: z.enum(tokenAttrEnum).describe(
    'Shape attribute to bind the token to. '
    + 'Common attrs: "fill" (background color), "stroke-color", "width", "height", '
    + '"opacity", "r1"-"r4" (border radius corners), "p1"-"p4" (padding), '
    + '"row-gap"/"column-gap" (layout gaps), "font-size", "font-family", "rotation".'
  ),
}).describe('A single token-to-attribute assignment object.');

export const applyTokensSchema = z.object({
  shapeIds: z.array(z.string().min(1)).min(1).describe(
    'Array of shape IDs to apply tokens to. Get these from get-current-page or get-selected-shapes.'
  ),
  assignments: z.array(tokenAssignmentSchema).min(1).describe(
    'Array of assignment OBJECTS. Each maps a token name to a shape attribute. '
    + 'Tokens are searched across all sets (active sets first). '
    + 'Example: [{"tokenName": "brand.primary", "attr": "fill"}, {"tokenName": "spacing.md", "attr": "width"}]'
  ),
});

export const activateTokensSetSchema = z.object({
  setId: z.string(),
  exclusive: z.boolean().optional().default(false).describe(
    'When true, deactivates all other sets before activating this one, '
    + 'so only the specified set remains active. Useful for switching themes.'
  ),
});

export const removeTokensSetSchema = z.object({
  setId: z.string().min(1).describe('ID of the token set to remove. Get it from get-tokens-sets or create-tokens-set.'),
});

const tokenModificationSchema = z.object({
  name: z.string().min(1).describe('Current name of the token to modify (or name for a new token if it does not exist).'),
  newName: z.string().min(1).optional().describe('New name for the token (rename). Omit to keep current name.'),
  type: z.enum(allTokenTypes).optional().describe('New type for the token. Required when creating a new token. Omit to keep current type.'),
  value: z.union([z.string(), z.number(), z.boolean()]).optional().describe(
    'New value for the token. Required when creating a new token. Omit to keep current value.'
  ),
}).describe('Modification descriptor for a single token. Identifies the token by name.');

export const modifyTokensSetSchema = z.object({
  setId: z.string().min(1).describe('ID of the token set to modify.'),
  tokensToModify: z.array(tokenModificationSchema).optional().describe(
    'Array of token modification OBJECTS. Each identifies a token by name and specifies changes. '
    + 'If the token does not exist it will be created (type and value are required in that case). '
    + 'Example: [{"name": "claro", "value": "#FFFFFF"}, {"name": "old-name", "newName": "new-name"}]'
  ),
  tokensToRemove: z.array(z.string().min(1)).optional().describe(
    'Array of token names to remove from the set. Example: ["obsolete-token", "brand.old"]'
  ),
});

export const createTokensSetSchema = z.object({
  name: z.string(),
  tokens: z.array(tokenSchema).min(1).describe(
    'Array of token OBJECTS. Each element must be a plain object like '
    + '{"type": "color", "name": "brand.primary", "value": "#6366F1"}. '
    + 'DO NOT pass tokens as JSON strings.'
  ),
  activate: z.boolean().optional().default(true).describe(
    'Whether to activate the set after creation so tokens are available for use'
  ),
});
