import { createOpencodeServer, createOpencodeClient } from "@opencode-ai/sdk/v2"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const omoConfigPath = join(__dirname, "../../assets/default-omo-config.json")

interface TestResult {
  agent: string
  model: string
  success: boolean
  responsePreview?: string
  error?: string
  durationMs: number
}

async function testAgent(
  client: ReturnType<typeof createOpencodeClient>,
  agentName: string,
  model: string
): Promise<TestResult> {
  const start = Date.now()
  
  console.log(`\n🤖 Testing agent: ${agentName} (${model})...`)
  
  try {
    const { data: session, error: sessionError } = await client.session.create()
    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${JSON.stringify(sessionError)}`)
    }

    const { data: response, error: promptError } = await client.session.prompt({
      sessionID: session.id,
      parts: [
        {
          type: "subtask",
          agent: agentName,
          prompt: "Say 'hello' in one word only",
          description: `Test ${agentName}`,
        }
      ]
    })

    if (promptError) {
      throw new Error(`Prompt failed: ${JSON.stringify(promptError)}`)
    }

    const responseText = JSON.stringify(response).slice(0, 200)
    
    const duration = Date.now() - start
    console.log(`✅ ${agentName} responded in ${duration}ms`)
    console.log(`   Response: "${responseText}${responseText.length > 100 ? '...' : ''}"`)

    return {
      agent: agentName,
      model,
      success: true,
      responsePreview: responseText,
      durationMs: duration,
    }
  } catch (error) {
    const duration = Date.now() - start
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${agentName} failed after ${duration}ms: ${errorMsg}`)
    
    return {
      agent: agentName,
      model,
      success: false,
      error: errorMsg,
      durationMs: duration,
    }
  }
}

async function main() {
  console.log("🚀 OMO Agent Smoke Test")
  console.log("========================\n")

  if (!process.env.AICODEWITH_API_KEY) {
    console.error("❌ AICODEWITH_API_KEY environment variable is required")
    process.exit(1)
  }

  const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
  const agents = Object.entries(omoConfig.agents as Record<string, { model: string }>)
  
  console.log(`Found ${agents.length} agents in OMO config:`)
  agents.forEach(([name, config]) => console.log(`  - ${name} (${config.model})`))

  console.log("\n📡 Starting opencode server...")
  let server: Awaited<ReturnType<typeof createOpencodeServer>> | null = null
  
  try {
    server = await createOpencodeServer({
      timeout: 30000,
      config: {
        plugin: ["opencode-aicodewith-auth", "oh-my-opencode"],
      },
    })
    console.log(`   Server running at ${server.url}`)

    const client = createOpencodeClient({ baseUrl: server.url })

    console.log("\n🔑 Setting API key...")
    const { error: authError } = await client.auth.set({
      providerID: "aicodewith",
      auth: { type: "api", key: process.env.AICODEWITH_API_KEY },
    })

    if (authError) {
      throw new Error(`Auth failed: ${JSON.stringify(authError)}`)
    }

    const results: TestResult[] = []
    
    for (const [agentName, config] of agents) {
      const result = await testAgent(client, agentName, config.model)
      results.push(result)
    }

    console.log("\n\n📊 Summary")
    console.log("==========")
    
    const passed = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`\n✅ Passed: ${passed.length}/${results.length}`)
    passed.forEach(r => {
      console.log(`   ${r.agent} (${r.durationMs}ms)`)
    })
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
      failed.forEach(r => {
        console.log(`   ${r.agent}: ${r.error}`)
      })
    }

    process.exit(failed.length > 0 ? 1 : 0)

  } catch (error) {
    console.error("\n💥 Fatal error:", error)
    process.exit(1)
  } finally {
    if (server) {
      console.log("\n🛑 Shutting down server...")
      server.close()
    }
  }
}

main()

