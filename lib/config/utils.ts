/**
 * @file utils.ts
 * @input  Configuration objects, JSON content
 * @output Utility functions for config comparison and JSON processing
 * @pos    Config layer - pure utility functions for testing
 */

/**
 * Deep equality comparison for configuration objects
 * Used to detect if provider config needs updating
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== "object") return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }

  return true
}

/**
 * Strip JSON comments (// and /* *\/) from content
 * Supports .jsonc files
 */
export const stripJsonComments = (content: string): string => {
  return content
    .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m))
    .replace(/,(\s*[}\]])/g, "$1")
}
