import { describe, it, expect } from "vitest"
import { 
  normalizeModel, 
  filterInput, 
  getReasoningConfig,
  addCodexBridgeMessage,
} from "../../lib/request/request-transformer"

describe("normalizeModel", () => {
  describe("GPT-5.2 models", () => {
    it("normalizes gpt-5.2-codex variants", () => {
      expect(normalizeModel("gpt-5.2-codex")).toBe("gpt-5.2-codex")
      expect(normalizeModel("GPT-5.2-CODEX")).toBe("gpt-5.2-codex")
      expect(normalizeModel("gpt 5.2 codex")).toBe("gpt-5.2-codex")
    })

    it("normalizes gpt-5.2 base model", () => {
      expect(normalizeModel("gpt-5.2")).toBe("gpt-5.2")
      expect(normalizeModel("GPT-5.2")).toBe("gpt-5.2")
      expect(normalizeModel("gpt 5.2")).toBe("gpt-5.2")
    })
  })

  describe("GPT-5.1 models", () => {
    it("normalizes gpt-5.1-codex variants", () => {
      expect(normalizeModel("gpt-5.1-codex")).toBe("gpt-5.1-codex")
      expect(normalizeModel("gpt 5.1 codex")).toBe("gpt-5.1-codex")
    })

    it("normalizes gpt-5.1-codex-max", () => {
      expect(normalizeModel("gpt-5.1-codex-max")).toBe("gpt-5.1-codex-max")
      expect(normalizeModel("gpt 5.1 codex max")).toBe("gpt-5.1-codex-max")
    })

    it("normalizes gpt-5.1-codex-mini", () => {
      expect(normalizeModel("gpt-5.1-codex-mini")).toBe("gpt-5.1-codex-mini")
      expect(normalizeModel("gpt 5.1 codex mini")).toBe("gpt-5.1-codex-mini")
    })

    it("normalizes gpt-5.1 base model", () => {
      expect(normalizeModel("gpt-5.1")).toBe("gpt-5.1")
      expect(normalizeModel("gpt 5.1")).toBe("gpt-5.1")
    })
  })

  describe("codex-mini-latest", () => {
    it("normalizes codex-mini-latest to gpt-5.1-codex-mini", () => {
      expect(normalizeModel("codex-mini-latest")).toBe("gpt-5.1-codex-mini")
    })

    it("normalizes gpt-5-codex-mini to gpt-5.1-codex-mini (matches 5.1 pattern first)", () => {
      expect(normalizeModel("gpt-5-codex-mini")).toBe("gpt-5.1-codex-mini")
    })

    it("normalizes gpt 5 codex mini (with spaces) to codex-mini-latest", () => {
      expect(normalizeModel("gpt 5 codex mini")).toBe("codex-mini-latest")
    })
  })

  describe("provider prefix handling", () => {
    it("strips aicodewith/ prefix", () => {
      expect(normalizeModel("aicodewith/gpt-5.2-codex")).toBe("gpt-5.2-codex")
      expect(normalizeModel("aicodewith/gpt-5.2")).toBe("gpt-5.2")
    })

    it("strips other provider prefixes", () => {
      expect(normalizeModel("openai/gpt-5.2")).toBe("gpt-5.2")
    })
  })

  describe("fallback behavior", () => {
    it("returns gpt-5.1 for undefined", () => {
      expect(normalizeModel(undefined)).toBe("gpt-5.1")
    })

    it("returns gpt-5.1 for generic codex", () => {
      expect(normalizeModel("codex")).toBe("gpt-5.1-codex")
    })

    it("returns gpt-5.1 for generic gpt-5", () => {
      expect(normalizeModel("gpt-5")).toBe("gpt-5.1")
      expect(normalizeModel("gpt 5")).toBe("gpt-5.1")
    })
  })
})

describe("filterInput", () => {
  it("returns input unchanged for non-array input", () => {
    expect(filterInput(undefined)).toBeUndefined()
    expect(filterInput(null as any)).toBeNull()
  })

  it("filters out item_reference types", () => {
    const input = [
      { type: "message", role: "user", content: "hello" },
      { type: "item_reference", role: "system" },
      { type: "message", role: "assistant", content: "hi" },
    ]
    const result = filterInput(input)
    expect(result).toHaveLength(2)
    expect(result?.every(item => item.type !== "item_reference")).toBe(true)
  })

  it("removes id field from items", () => {
    const input = [
      { id: "msg-1", type: "message", role: "user", content: "hello" },
      { id: "msg-2", type: "message", role: "assistant", content: "hi" },
    ]
    const result = filterInput(input)
    expect(result?.every(item => !("id" in item))).toBe(true)
  })

  it("preserves other fields", () => {
    const input = [
      { id: "msg-1", type: "message", role: "user", content: "hello", metadata: { key: "value" } },
    ]
    const result = filterInput(input)
    expect(result?.[0]).toEqual({
      type: "message",
      role: "user",
      content: "hello",
      metadata: { key: "value" },
    })
  })
})

describe("getReasoningConfig", () => {
  describe("default effort levels", () => {
    it("returns high for gpt-5.2-codex", () => {
      const config = getReasoningConfig("gpt-5.2-codex")
      expect(config.effort).toBe("high")
    })

    it("returns high for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2")
      expect(config.effort).toBe("high")
    })

    it("returns high for codex-max", () => {
      const config = getReasoningConfig("gpt-5.1-codex-max")
      expect(config.effort).toBe("high")
    })

    it("returns medium for codex-mini", () => {
      const config = getReasoningConfig("codex-mini-latest")
      expect(config.effort).toBe("medium")
    })

    it("returns medium for regular codex", () => {
      const config = getReasoningConfig("gpt-5.1-codex")
      expect(config.effort).toBe("medium")
    })
  })

  describe("user config overrides", () => {
    it("respects user reasoningEffort", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "low" })
      expect(config.effort).toBe("low")
    })

    it("respects user reasoningSummary", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningSummary: "detailed" })
      expect(config.summary).toBe("detailed")
    })
  })

  describe("effort level constraints", () => {
    it("downgrades xhigh to high for non-supporting models", () => {
      const config = getReasoningConfig("gpt-5.1-codex", { reasoningEffort: "xhigh" })
      expect(config.effort).toBe("high")
    })

    it("allows xhigh for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "xhigh" })
      expect(config.effort).toBe("xhigh")
    })

    it("allows xhigh for gpt-5.2-codex", () => {
      const config = getReasoningConfig("gpt-5.2-codex", { reasoningEffort: "xhigh" })
      expect(config.effort).toBe("xhigh")
    })

    it("upgrades none to low for non-supporting models", () => {
      const config = getReasoningConfig("gpt-5.1-codex", { reasoningEffort: "none" })
      expect(config.effort).toBe("low")
    })

    it("allows none for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "none" })
      expect(config.effort).toBe("none")
    })

    it("allows none for gpt-5.1 base", () => {
      const config = getReasoningConfig("gpt-5.1", { reasoningEffort: "none" })
      expect(config.effort).toBe("none")
    })

    it("constrains codex-mini to medium or high only", () => {
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "low" }).effort).toBe("medium")
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "minimal" }).effort).toBe("medium")
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "none" }).effort).toBe("medium")
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "xhigh" }).effort).toBe("high")
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "high" }).effort).toBe("high")
      expect(getReasoningConfig("codex-mini-latest", { reasoningEffort: "medium" }).effort).toBe("medium")
    })

    it("upgrades minimal to low for codex models", () => {
      const config = getReasoningConfig("gpt-5.1-codex", { reasoningEffort: "minimal" })
      expect(config.effort).toBe("low")
    })
  })

  describe("default summary", () => {
    it("defaults to auto", () => {
      const config = getReasoningConfig("gpt-5.2")
      expect(config.summary).toBe("auto")
    })
  })
})

describe("addCodexBridgeMessage", () => {
  it("returns undefined for non-array input", () => {
    expect(addCodexBridgeMessage(undefined, true)).toBeUndefined()
  })

  it("returns input unchanged when hasTools is false", () => {
    const input = [{ type: "message", role: "user", content: "hello" }]
    expect(addCodexBridgeMessage(input, false)).toBe(input)
  })

  it("prepends bridge message when hasTools is true", () => {
    const input = [{ type: "message", role: "user", content: "hello" }]
    const result = addCodexBridgeMessage(input, true)
    
    expect(result).toHaveLength(2)
    expect(result?.[0].type).toBe("message")
    expect(result?.[0].role).toBe("developer")
    expect(result?.[1]).toEqual(input[0])
  })
})
