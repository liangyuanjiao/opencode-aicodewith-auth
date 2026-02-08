#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { PROVIDER_ID } from "../lib/constants"
import { OMO_MODEL_ASSIGNMENTS } from "../lib/models/registry"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, "../assets/default-omo-config.json")

const OMO_PATH = process.env.OMO_PATH || "/tmp/oh-my-opencode"

const CUSTOM_AGENTS = ["build", "plan", "sisyphus-junior", "OpenCode-Builder", "general", "frontend-ui-ux-engineer", "document-writer"]
const CUSTOM_CATEGORIES = ["visual", "business-logic", "data-analysis"]

async function main() {
  const { generateModelConfig } = await import(`${OMO_PATH}/src/cli/model-fallback.ts`)
  
  const installConfig = {
    hasClaude: true,
    hasOpenAI: true,
    hasGemini: true,
    hasOpencodeZen: false,
    hasCopilot: false,
    hasZaiCodingPlan: false,
    hasKimiForCoding: false,
    isMax20: false,
  }

  const omoConfig = generateModelConfig(installConfig)

  const convertedConfig = {
    $schema: omoConfig.$schema,
    agents: {} as Record<string, { model: string }>,
    categories: {} as Record<string, { model: string }>,
  }

  if (omoConfig.agents) {
    for (const [name, agent] of Object.entries(omoConfig.agents)) {
      const agentConfig = agent as { model: string }
      const originalModel = agentConfig.model
      const aicodewithModel = convertToAicodewithModel(originalModel)
      convertedConfig.agents[name] = { model: aicodewithModel }
    }
  }

  for (const agentName of CUSTOM_AGENTS) {
    if (OMO_MODEL_ASSIGNMENTS.agents[agentName]) {
      convertedConfig.agents[agentName] = { model: OMO_MODEL_ASSIGNMENTS.agents[agentName] }
    }
  }

  if (omoConfig.categories) {
    for (const [name, category] of Object.entries(omoConfig.categories)) {
      const categoryConfig = category as { model: string }
      const originalModel = categoryConfig.model
      const aicodewithModel = convertToAicodewithModel(originalModel)
      convertedConfig.categories[name] = { model: aicodewithModel }
    }
  }

  for (const categoryName of CUSTOM_CATEGORIES) {
    if (OMO_MODEL_ASSIGNMENTS.categories[categoryName]) {
      convertedConfig.categories[categoryName] = { model: OMO_MODEL_ASSIGNMENTS.categories[categoryName] }
    }
  }

  writeFileSync(outputPath, JSON.stringify(convertedConfig, null, 2) + "\n")

  const agentCount = Object.keys(convertedConfig.agents).length
  const categoryCount = Object.keys(convertedConfig.categories).length
  console.log(`Generated default-omo-config.json with ${agentCount} agents and ${categoryCount} categories`)
  console.log(`Source: oh-my-opencode at ${OMO_PATH} + custom agents/categories`)
}

function convertToAicodewithModel(omoModel: string): string {
  const [provider, model] = omoModel.split("/")
  
  const modelMap: Record<string, string> = {
    "claude-opus-4.6": "claude-opus-4-6-20260205",
    "claude-opus-4-6": "claude-opus-4-6-20260205",
    "claude-sonnet-4.5": "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
    "claude-haiku-4.5": "claude-haiku-4-5-20251001",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
    "gpt-5.3-codex": "gpt-5.3-codex",
    "gpt-5.2": "gpt-5.2",
    "gemini-3-pro": "gemini-3-pro",
    "gemini-3-pro-preview": "gemini-3-pro",
    "gemini-3-flash": "gemini-3-pro",
    "gemini-3-flash-preview": "gemini-3-pro",
  }

  const mappedModel = modelMap[model] || model
  return `${PROVIDER_ID}/${mappedModel}`
}

main()
