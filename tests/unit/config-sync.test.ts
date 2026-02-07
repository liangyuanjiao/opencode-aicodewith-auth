import { describe, it, expect } from "vitest"
import { 
  applyProviderConfig, 
  buildStandardProviderConfig,
  ensurePluginEntry,
  isPackageEntry,
} from "../../lib/config/sync"
import { PROVIDER_ID, MODEL_MIGRATIONS } from "../../lib/constants"

describe("isPackageEntry", () => {
  it("matches exact package name", () => {
    expect(isPackageEntry("opencode-aicodewith-auth")).toBe(true)
  })

  it("matches package name with version", () => {
    expect(isPackageEntry("opencode-aicodewith-auth@1.0.0")).toBe(true)
    expect(isPackageEntry("opencode-aicodewith-auth@latest")).toBe(true)
  })

  it("does not match other packages", () => {
    expect(isPackageEntry("other-plugin")).toBe(false)
    expect(isPackageEntry("opencode-other-auth")).toBe(false)
  })
})

describe("ensurePluginEntry", () => {
  const pluginEntry = "file:///path/to/plugin.ts"

  it("creates array with plugin if list is not an array", () => {
    expect(ensurePluginEntry(undefined, pluginEntry)).toEqual([pluginEntry])
    expect(ensurePluginEntry(null, pluginEntry)).toEqual([pluginEntry])
    expect(ensurePluginEntry("string", pluginEntry)).toEqual([pluginEntry])
  })

  it("returns same array if plugin already exists", () => {
    const list = [pluginEntry, "other-plugin"]
    expect(ensurePluginEntry(list, pluginEntry)).toBe(list)
  })

  it("returns same array if package name entry exists", () => {
    const list = ["opencode-aicodewith-auth", "other-plugin"]
    expect(ensurePluginEntry(list, pluginEntry)).toBe(list)
  })

  it("returns same array if versioned package entry exists", () => {
    const list = ["opencode-aicodewith-auth@1.0.0", "other-plugin"]
    expect(ensurePluginEntry(list, pluginEntry)).toBe(list)
  })

  it("adds plugin to array if not present", () => {
    const list = ["other-plugin"]
    const result = ensurePluginEntry(list, pluginEntry)
    expect(result).toEqual(["other-plugin", pluginEntry])
    expect(result).not.toBe(list)
  })

  it("handles empty array", () => {
    const result = ensurePluginEntry([], pluginEntry)
    expect(result).toEqual([pluginEntry])
  })
})

describe("applyProviderConfig", () => {
  const pluginEntry = "file:///path/to/plugin.ts"
  const standardProvider = {
    name: "AICodewith",
    models: { "gpt-5.3": { name: "GPT-5.3" } },
    npm: "file:///path/to/provider.ts",
  }

  describe("provider config updates", () => {
    it("adds provider config to empty config", () => {
      const config: Record<string, unknown> = {}
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changed).toBe(true)
      expect(result.changes).toContain("provider_updated")
      expect(result.changes).toContain("plugin_added")
      expect((config.provider as Record<string, unknown>)[PROVIDER_ID]).toEqual(standardProvider)
    })

    it("updates provider config when different", () => {
      const config: Record<string, unknown> = {
        provider: {
          [PROVIDER_ID]: {
            name: "AICodewith",
            models: { "gpt-5.1": { name: "GPT-5.1" } },
          }
        },
        plugin: [pluginEntry],
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changed).toBe(true)
      expect(result.changes).toContain("provider_updated")
      expect((config.provider as Record<string, unknown>)[PROVIDER_ID]).toEqual(standardProvider)
    })

    it("does not update when provider config is identical", () => {
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: [pluginEntry],
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changed).toBe(false)
      expect(result.changes).toEqual([])
    })

    it("preserves other providers in config", () => {
      const config: Record<string, unknown> = {
        provider: {
          "other-provider": { name: "Other" },
        },
        plugin: [pluginEntry],
      }
      applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect((config.provider as Record<string, unknown>)["other-provider"]).toEqual({ name: "Other" })
      expect((config.provider as Record<string, unknown>)[PROVIDER_ID]).toEqual(standardProvider)
    })
  })

  describe("plugin entry management", () => {
    it("adds plugin entry when missing", () => {
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: ["other-plugin"],
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changes).toContain("plugin_added")
      expect(config.plugin).toContain(pluginEntry)
      expect(config.plugin).toContain("other-plugin")
    })

    it("does not duplicate plugin entry", () => {
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: [pluginEntry],
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changes).not.toContain("plugin_added")
      expect((config.plugin as string[]).filter(p => p === pluginEntry)).toHaveLength(1)
    })
  })

  describe("model migrations", () => {
    it("migrates deprecated model in config.model", () => {
      const deprecatedModel = Object.keys(MODEL_MIGRATIONS)[0]
      if (!deprecatedModel) {
        return
      }
      
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: [pluginEntry],
        model: deprecatedModel,
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changed).toBe(true)
      expect(result.changes.some(c => c.startsWith("model_migrated:"))).toBe(true)
      expect(config.model).toBe(MODEL_MIGRATIONS[deprecatedModel])
    })

    it("does not change non-deprecated model", () => {
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: [pluginEntry],
        model: "aicodewith/gpt-5.3",
      }
      const result = applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(result.changes.some(c => c.startsWith("model_migrated:"))).toBe(false)
      expect(config.model).toBe("aicodewith/gpt-5.3")
    })
  })

  describe("aicodewith provider sync scenarios", () => {
    it("replaces old model version with new version (e.g., opus 4.5 -> 4.6)", () => {
      const oldConfig: Record<string, unknown> = {
        provider: {
          [PROVIDER_ID]: {
            name: "AICodewith",
            models: {
              "claude-opus-4-5-20251101": { name: "Claude Opus 4.5" },
              "gpt-5.3": { name: "GPT-5.3" },
            },
            npm: "file:///path/to/provider.ts",
          }
        },
        plugin: [pluginEntry],
      }
      
      const newStandardProvider = {
        name: "AICodewith",
        models: {
          "claude-opus-4-6-20260205": { name: "Claude Opus 4.6" },
          "gpt-5.3": { name: "GPT-5.3" },
        },
        npm: "file:///path/to/provider.ts",
      }
      
      const result = applyProviderConfig(oldConfig, newStandardProvider, pluginEntry)
      
      expect(result.changed).toBe(true)
      const updatedProvider = (oldConfig.provider as Record<string, unknown>)[PROVIDER_ID] as Record<string, unknown>
      const models = updatedProvider.models as Record<string, unknown>
      expect(models["claude-opus-4-5-20251101"]).toBeUndefined()
      expect(models["claude-opus-4-6-20260205"]).toEqual({ name: "Claude Opus 4.6" })
    })

    it("adds new models from plugin update", () => {
      const oldConfig: Record<string, unknown> = {
        provider: {
          [PROVIDER_ID]: {
            name: "AICodewith",
            models: {
              "gpt-5.3": { name: "GPT-5.3" },
            },
            npm: "file:///path/to/provider.ts",
          }
        },
        plugin: [pluginEntry],
      }
      
      const newStandardProvider = {
        name: "AICodewith",
        models: {
          "gpt-5.3": { name: "GPT-5.3" },
          "gpt-5.4-codex": { name: "GPT-5.4 Codex" },
        },
        npm: "file:///path/to/provider.ts",
      }
      
      applyProviderConfig(oldConfig, newStandardProvider, pluginEntry)
      
      const updatedProvider = (oldConfig.provider as Record<string, unknown>)[PROVIDER_ID] as Record<string, unknown>
      const models = updatedProvider.models as Record<string, unknown>
      expect(models["gpt-5.4-codex"]).toEqual({ name: "GPT-5.4 Codex" })
    })

    it("removes deprecated models from plugin update", () => {
      const oldConfig: Record<string, unknown> = {
        provider: {
          [PROVIDER_ID]: {
            name: "AICodewith",
            models: {
              "gpt-5.2": { name: "GPT-5.2" },
              "gpt-5.3": { name: "GPT-5.3" },
            },
            npm: "file:///path/to/provider.ts",
          }
        },
        plugin: [pluginEntry],
      }
      
      const newStandardProvider = {
        name: "AICodewith",
        models: {
          "gpt-5.3": { name: "GPT-5.3" },
        },
        npm: "file:///path/to/provider.ts",
      }
      
      applyProviderConfig(oldConfig, newStandardProvider, pluginEntry)
      
      const updatedProvider = (oldConfig.provider as Record<string, unknown>)[PROVIDER_ID] as Record<string, unknown>
      const models = updatedProvider.models as Record<string, unknown>
      expect(models["gpt-5.2"]).toBeUndefined()
      expect(models["gpt-5.3"]).toEqual({ name: "GPT-5.3" })
    })

    it("overwrites user's custom model limits to match plugin definition", () => {
      const userCustomConfig: Record<string, unknown> = {
        provider: {
          [PROVIDER_ID]: {
            name: "AICodewith",
            models: {
              "gpt-5.3": { 
                name: "My Custom GPT", 
                limit: { context: 999999, output: 999999 } 
              }
            },
            npm: "file:///path/to/provider.ts",
          }
        },
        plugin: [pluginEntry],
      }
      
      const result = applyProviderConfig(userCustomConfig, standardProvider, pluginEntry)
      
      expect(result.changed).toBe(true)
      expect(result.changes).toContain("provider_updated")
      expect((userCustomConfig.provider as Record<string, unknown>)[PROVIDER_ID]).toEqual(standardProvider)
    })
  })

  describe("other config preservation", () => {
    it("preserves user's other config fields outside provider", () => {
      const config: Record<string, unknown> = {
        provider: { [PROVIDER_ID]: { ...standardProvider } },
        plugin: [pluginEntry],
        customField: "user value",
        anotherField: { nested: true },
      }
      
      applyProviderConfig(config, standardProvider, pluginEntry)
      
      expect(config.customField).toBe("user value")
      expect(config.anotherField).toEqual({ nested: true })
    })
  })
})

describe("buildStandardProviderConfig", () => {
  it("includes npm path in config", () => {
    const npmPath = "file:///path/to/provider.ts"
    const config = buildStandardProviderConfig(npmPath)
    
    expect(config.npm).toBe(npmPath)
    expect(config.name).toBe("AICodewith")
    expect(config.models).toBeDefined()
  })
})
