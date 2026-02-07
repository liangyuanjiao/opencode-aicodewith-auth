#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { buildProviderConfig } from "../lib/models"

const __dirname = dirname(fileURLToPath(import.meta.url))
const config = buildProviderConfig()
const outputPath = join(__dirname, "../lib/provider-config.json")

writeFileSync(outputPath, JSON.stringify(config, null, 2) + "\n")

console.log(`Generated provider-config.json with ${Object.keys(config.models).length} models`)
