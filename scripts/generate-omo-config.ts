#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { buildOmoConfig } from "../lib/models"

const __dirname = dirname(fileURLToPath(import.meta.url))
const config = buildOmoConfig()
const outputPath = join(__dirname, "../assets/default-omo-config.json")

writeFileSync(outputPath, JSON.stringify(config, null, 2) + "\n")

const agentCount = Object.keys(config.agents as object).length
const categoryCount = Object.keys(config.categories as object).length
console.log(`Generated default-omo-config.json with ${agentCount} agents and ${categoryCount} categories`)
