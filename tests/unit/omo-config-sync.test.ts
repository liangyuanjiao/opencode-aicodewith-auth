import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockAccess = vi.mocked(access)

const DEFAULT_OMO_CONFIG = {
  $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  agents: {
    sisyphus: { model: "aicodewith/claude-sonnet-4-5-20250929" },
    oracle: { model: "aicodewith/gpt-5.2" },
    build: { model: "aicodewith/claude-opus-4-6-20260205" },
  },
  categories: {
    quick: { model: "aicodewith/claude-sonnet-4-5-20250929" },
    ultrabrain: { model: "aicodewith/gemini-3-pro" },
  },
}

describe("OMO Config Sync", () => {
  let syncOmoConfig: () => Promise<void>
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    originalEnv = { ...process.env }
    delete process.env.AICODEWITH_DISABLE_OMO_SYNC
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(DEFAULT_OMO_CONFIG),
    })

    const module = await import("../../lib/hooks/omo-config-sync/index")
    syncOmoConfig = module.syncOmoConfig
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe("environment variable control", () => {
    it("skips sync when AICODEWITH_DISABLE_OMO_SYNC=1", async () => {
      process.env.AICODEWITH_DISABLE_OMO_SYNC = "1"
      
      const module = await import("../../lib/hooks/omo-config-sync/index")
      await module.syncOmoConfig()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it("skips sync when AICODEWITH_DISABLE_OMO_SYNC=true", async () => {
      process.env.AICODEWITH_DISABLE_OMO_SYNC = "true"
      
      const module = await import("../../lib/hooks/omo-config-sync/index")
      await module.syncOmoConfig()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it("proceeds with sync when env var is not set", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
      
      await syncOmoConfig()
      
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe("new user (no config file)", () => {
    beforeEach(() => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
    })

    it("creates config with default agents and categories", async () => {
      await syncOmoConfig()
      
      expect(mockWriteFile).toHaveBeenCalled()
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      
      expect(writtenContent.agents.sisyphus).toEqual({ model: "aicodewith/claude-sonnet-4-5-20250929" })
      expect(writtenContent.agents.oracle).toEqual({ model: "aicodewith/gpt-5.2" })
      expect(writtenContent.categories.quick).toEqual({ model: "aicodewith/claude-sonnet-4-5-20250929" })
    })

    it("includes $schema in new config", async () => {
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.$schema).toContain("oh-my-opencode.schema.json")
    })
  })

  describe("existing user config", () => {
    it("adds missing agents from default config", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-5-20250929" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.oracle).toEqual({ model: "aicodewith/gpt-5.2" })
      expect(writtenContent.agents.build).toEqual({ model: "aicodewith/claude-opus-4-6-20260205" })
    })

    it("adds missing categories from default config", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          quick: { model: "aicodewith/claude-sonnet-4-5-20250929" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.ultrabrain).toEqual({ model: "aicodewith/gemini-3-pro" })
    })

    it("preserves user customized agent model (does NOT overwrite)", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "openai/gpt-4o" },
          oracle: { model: "anthropic/claude-3-opus" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.model).toBe("openai/gpt-4o")
      expect(writtenContent.agents.oracle.model).toBe("anthropic/claude-3-opus")
    })

    it("preserves user customized category model (does NOT overwrite)", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          quick: { model: "openai/gpt-4o-mini" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.quick.model).toBe("openai/gpt-4o-mini")
    })

    it("preserves user's extra config fields", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { 
            model: "aicodewith/claude-sonnet-4-5-20250929",
            temperature: 0.5,
            customField: "user value",
          },
        },
        categories: {},
        userCustomSection: { foo: "bar" },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.temperature).toBe(0.5)
      expect(writtenContent.agents.sisyphus.customField).toBe("user value")
      expect(writtenContent.userCustomSection).toEqual({ foo: "bar" })
    })
  })

  describe("model migration", () => {
    it("migrates deprecated agent models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          build: { model: "aicodewith/claude-opus-4-5-20251101" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.build.model).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("migrates deprecated category models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          ultrabrain: { model: "aicodewith/claude-opus-4-5-20251101" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.ultrabrain.model).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("does not migrate non-aicodewith models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "openai/gpt-4o" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.model).toBe("openai/gpt-4o")
    })
  })

  describe("no changes needed", () => {
    it("does not write file when config is already in sync", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-5-20250929" },
          oracle: { model: "aicodewith/gpt-5.2" },
          build: { model: "aicodewith/claude-opus-4-6-20260205" },
        },
        categories: {
          quick: { model: "aicodewith/claude-sonnet-4-5-20250929" },
          ultrabrain: { model: "aicodewith/gemini-3-pro" },
        },
      }))
      
      await syncOmoConfig()
      
      expect(mockWriteFile).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("handles fetch failure gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it("handles fetch timeout gracefully", async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 100)
      }))
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
    })

    it("handles invalid JSON in user config gracefully", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue("{ invalid json }")
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it("handles write failure gracefully", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
      mockWriteFile.mockRejectedValue(new Error("Permission denied"))
      
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
