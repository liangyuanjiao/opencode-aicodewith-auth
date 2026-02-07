/**
 * @file sync.ts
 * @input  User config object, standard provider config
 * @output Updated config with provider settings applied
 * @pos    Config layer - handles config synchronization logic
 */

import { PROVIDER_ID, MODEL_MIGRATIONS } from "../constants"
import { deepEqual } from "./utils"
import STANDARD_PROVIDER_CONFIG from "../provider-config.json"

const PACKAGE_NAME = "opencode-aicodewith-auth"

export const isPackageEntry = (value: string) => 
  value === PACKAGE_NAME || value.startsWith(`${PACKAGE_NAME}@`)

export const buildStandardProviderConfig = (npmPath: string) => ({
  ...STANDARD_PROVIDER_CONFIG,
  npm: npmPath,
})

export const ensurePluginEntry = (list: unknown, pluginEntry: string) => {
  if (!Array.isArray(list)) return [pluginEntry]
  const hasPlugin = list.some(
    (entry) => typeof entry === "string" && (entry === pluginEntry || isPackageEntry(entry))
  )
  return hasPlugin ? list : [...list, pluginEntry]
}

export interface ApplyConfigResult {
  changed: boolean
  changes: string[]
}

export const applyProviderConfig = (
  config: Record<string, unknown>,
  standardProvider: Record<string, unknown>,
  pluginEntry: string,
): ApplyConfigResult => {
  const changes: string[] = []

  const providerMap = config.provider && typeof config.provider === "object" 
    ? (config.provider as Record<string, unknown>)
    : {}
  const existingProvider = providerMap[PROVIDER_ID]

  if (!deepEqual(existingProvider, standardProvider)) {
    providerMap[PROVIDER_ID] = standardProvider
    config.provider = providerMap
    changes.push("provider_updated")
  }

  const nextPlugins = ensurePluginEntry(config.plugin, pluginEntry)
  if (nextPlugins !== config.plugin) {
    config.plugin = nextPlugins
    changes.push("plugin_added")
  }

  if (config.model && typeof config.model === "string" && MODEL_MIGRATIONS[config.model]) {
    const oldModel = config.model
    config.model = MODEL_MIGRATIONS[config.model]
    changes.push(`model_migrated:${oldModel}`)
  }

  return {
    changed: changes.length > 0,
    changes,
  }
}
