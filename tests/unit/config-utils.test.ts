import { describe, it, expect } from "vitest"
import { deepEqual, stripJsonComments } from "../../lib/config/utils"

describe("deepEqual", () => {
  describe("primitive values", () => {
    it("returns true for identical primitives", () => {
      expect(deepEqual(1, 1)).toBe(true)
      expect(deepEqual("a", "a")).toBe(true)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)
    })

    it("returns false for different primitives", () => {
      expect(deepEqual(1, 2)).toBe(false)
      expect(deepEqual("a", "b")).toBe(false)
      expect(deepEqual(true, false)).toBe(false)
      expect(deepEqual(null, undefined)).toBe(false)
    })

    it("returns false for different types", () => {
      expect(deepEqual(1, "1")).toBe(false)
      expect(deepEqual(0, false)).toBe(false)
      expect(deepEqual(null, {})).toBe(false)
    })
  })

  describe("objects", () => {
    it("returns true for identical objects", () => {
      expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true)
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    })

    it("returns true for same object reference", () => {
      const obj = { a: 1 }
      expect(deepEqual(obj, obj)).toBe(true)
    })

    it("returns false for objects with different keys", () => {
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it("returns false for objects with different values", () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    })

    it("handles nested objects", () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
      expect(deepEqual({ a: { b: { c: 3 } } }, { a: { b: { c: 3 } } })).toBe(true)
    })

    it("returns false when comparing object to null", () => {
      expect(deepEqual({ a: 1 }, null)).toBe(false)
      expect(deepEqual(null, { a: 1 })).toBe(false)
    })
  })

  describe("arrays", () => {
    it("returns true for identical arrays", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(deepEqual([], [])).toBe(true)
    })

    it("returns false for arrays with different length", () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it("returns false for arrays with different values", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    })

    it("handles nested arrays", () => {
      expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true)
      expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false)
    })
  })

  describe("mixed structures (real config scenarios)", () => {
    it("compares provider config objects", () => {
      const config1 = {
        name: "AICodewith",
        models: {
          "gpt-5.2": { name: "GPT-5.2", limit: { context: 400000 } }
        }
      }
      const config2 = {
        name: "AICodewith",
        models: {
          "gpt-5.2": { name: "GPT-5.2", limit: { context: 400000 } }
        }
      }
      expect(deepEqual(config1, config2)).toBe(true)
    })

    it("detects model config changes", () => {
      const oldConfig = {
        models: { "gpt-5.2": { limit: { output: 64000 } } }
      }
      const newConfig = {
        models: { "gpt-5.2": { limit: { output: 128000 } } }
      }
      expect(deepEqual(oldConfig, newConfig)).toBe(false)
    })

    it("detects new model added", () => {
      const oldConfig = {
        models: { "gpt-5.2": {} }
      }
      const newConfig = {
        models: { "gpt-5.2": {}, "gpt-5.3": {} }
      }
      expect(deepEqual(oldConfig, newConfig)).toBe(false)
    })
  })
})

describe("stripJsonComments", () => {
  it("removes single-line comments", () => {
    const input = `{
      "key": "value" // this is a comment
    }`
    const result = stripJsonComments(input)
    expect(result).not.toContain("// this is a comment")
    expect(result).toContain('"key": "value"')
  })

  it("removes multi-line comments", () => {
    const input = `{
      /* this is
         a multi-line comment */
      "key": "value"
    }`
    const result = stripJsonComments(input)
    expect(result).not.toContain("multi-line comment")
    expect(result).toContain('"key": "value"')
  })

  it("removes trailing commas before closing brackets", () => {
    const input = `{
      "key": "value",
    }`
    const result = stripJsonComments(input)
    expect(JSON.parse(result)).toEqual({ key: "value" })
  })

  it("removes trailing commas before closing square brackets", () => {
    const input = `["a", "b",]`
    const result = stripJsonComments(input)
    expect(JSON.parse(result)).toEqual(["a", "b"])
  })

  it("preserves strings containing comment-like content", () => {
    const input = `{
      "url": "https://example.com/path",
      "comment": "// not a real comment"
    }`
    const result = stripJsonComments(input)
    const parsed = JSON.parse(result)
    expect(parsed.url).toBe("https://example.com/path")
    expect(parsed.comment).toBe("// not a real comment")
  })

  it("handles complex jsonc content", () => {
    const input = `{
      // Schema reference
      "$schema": "https://opencode.ai/config.json",
      "plugin": [
        "opencode-aicodewith-auth" // main plugin
      ],
      /* Provider configuration
         with multiple models */
      "provider": {
        "aicodewith": {
          "name": "AICodewith",
        }
      },
    }`
    const result = stripJsonComments(input)
    const parsed = JSON.parse(result)
    expect(parsed.$schema).toBe("https://opencode.ai/config.json")
    expect(parsed.plugin).toEqual(["opencode-aicodewith-auth"])
    expect(parsed.provider.aicodewith.name).toBe("AICodewith")
  })
})
