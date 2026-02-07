/**
 * @file model-map.ts
 * @input  Config model ID (e.g., "gpt-5.2-codex-high")
 * @output Normalized API model name (e.g., "gpt-5.2-codex")
 * @pos    Helper - derives model mapping from central registry
 */

import { buildAliasMap } from "../../models"

const MODEL_MAP = buildAliasMap()

export function getNormalizedModel(modelId: string): string | undefined {
	const lowerModelId = modelId.toLowerCase().trim()
	return MODEL_MAP[lowerModelId]
}

export function isKnownModel(modelId: string): boolean {
	return getNormalizedModel(modelId) !== undefined
}
