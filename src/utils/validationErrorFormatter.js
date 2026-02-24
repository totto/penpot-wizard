/**
 * Formats validation errors (Zod/AI SDK style) into a structured payload object.
 * Handles both JSON-embedded format and Zod issues array.
 */

/**
 * Normalizes a validation issue into a clean object.
 * @param {Object} issue - { code, path, message, values?, options?, received? }
 * @returns {Object} { field, message, validValues?, received? }
 */
function normalizeIssue(issue) {
  const field = Array.isArray(issue.path) && issue.path.length > 0
    ? issue.path.join('.')
    : 'input';
  const values = issue.values ?? issue.options ?? issue.enum;
  const validValues = Array.isArray(values) ? values : null;

  const obj = {
    field,
    message: issue.message || 'Invalid input',
  };
  if (validValues) obj.validValues = validValues;
  if (issue.received !== undefined) obj.received = issue.received;
  return obj;
}

/**
 * Parses validation error message that may contain JSON issues array.
 * @param {string} errorMessage - Raw error message
 * @returns {{ toolName: string|null, issues: Array }|null}
 */
function parseValidationError(errorMessage) {
  if (typeof errorMessage !== 'string' || !errorMessage) return null;

  let toolName = null;
  const toolMatch = errorMessage.match(/Invalid input for tool ([\w-]+)/);
  if (toolMatch) toolName = toolMatch[1];

  const jsonMatch = errorMessage.match(/Error message:\s*(\[[\s\S]*\])/);
  let issues = [];
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      issues = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return { toolName, issues: [] };
    }
  }

  return { toolName, issues };
}

/**
 * Formats validation errors into a structured payload object.
 * @param {string} errorMessage - Raw error message
 * @param {Array} [zodIssues] - Optional Zod issues from error.cause?.issues
 * @returns {Object|null} Payload { toolName?, issues, suggestion? } or null
 */
export function formatValidationErrorToPayload(errorMessage, zodIssues = null) {
  const parsed = parseValidationError(errorMessage);
  const issues = zodIssues ?? parsed?.issues ?? [];

  if (issues.length === 0) return null;

  return {
    toolName: parsed?.toolName ?? undefined,
    issues: issues.map(normalizeIssue),
  };
}

/**
 * If the given output is a failed tool result with a validation-style error,
 * returns { success: false, payload: {...} } with structured validation data.
 * @param {Object} output - Tool output, e.g. { success: false, payload: { error: "..." } }
 * @returns {Object} Output with { success: false, payload: {...} }
 */
export function formatToolOutputError(output) {
  if (!output || typeof output !== 'object') return output;
  const errorStr = output?.payload?.error ?? output?.error;
  if (typeof errorStr !== 'string') return output;

  const payload = formatValidationErrorToPayload(errorStr);
  if (!payload) return output;

  return {
    success: false,
    payload,
  };
}
