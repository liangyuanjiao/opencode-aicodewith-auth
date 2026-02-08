import { createOpencodeServer, createOpencodeClient } from "@opencode-ai/sdk/v2"
import { getActiveModels, PROVIDER_ID } from "../../lib/models/registry"

interface TestResult {
  model: string
  success: boolean
  responsePreview?: string
  error?: string
  durationMs: number
}

async function testModel(
  client: ReturnType<typeof createOpencodeClient>,
  modelId: string
): Promise<TestResult> {
  const fullModelId = `${PROVIDER_ID}/${modelId}`
  const start = Date.now()
  
  console.log(`\n🧪 Testing ${fullModelId}...`)
  
  try {
    const { data: session, error: sessionError } = await client.session.create()
    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${JSON.stringify(sessionError)}`)
    }

    const { data: response, error: promptError } = await client.session.prompt({
      sessionID: session.id,
      parts: [{ type: "text", text: "hi" }],
      model: {
        providerID: PROVIDER_ID,
        modelID: modelId,
      },
    })

    if (promptError) {
      throw new Error(`Prompt failed: ${JSON.stringify(promptError)}`)
    }

    const assistantMessage = (response as any)?.parts?.find((p: any) => p.type === "text")
    const responseText = assistantMessage?.text || "(no text response)"
    
    const duration = Date.now() - start
    console.log(`✅ ${fullModelId} responded in ${duration}ms`)
    console.log(`   Response: "${responseText.slice(0, 100)}${responseText.length > 100 ? '...' : ''}"`)

    return {
      model: fullModelId,
      success: true,
      responsePreview: responseText.slice(0, 200),
      durationMs: duration,
    }
  } catch (error) {
    const duration = Date.now() - start
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${fullModelId} failed after ${duration}ms: ${errorMsg}`)
    
    return {
      model: fullModelId,
      success: false,
      error: errorMsg,
      durationMs: duration,
    }
  }
}

async function main() {
  console.log("🚀 AICodewith Model Smoke Test")
  console.log("================================\n")

  if (!process.env.AICODEWITH_API_KEY) {
    console.error("❌ AICODEWITH_API_KEY environment variable is required")
    process.exit(1)
  }

  const activeModels = getActiveModels()
  console.log(`Found ${activeModels.length} active models:`)
  activeModels.forEach(m => console.log(`  - ${m.id} (${m.displayName})`))

  console.log("\n📡 Starting opencode server...")
  let server: Awaited<ReturnType<typeof createOpencodeServer>> | null = null
  
  try {
    server = await createOpencodeServer({
      timeout: 30000,
      config: {
        plugin: ["opencode-aicodewith-auth"],
      },
    })
    console.log(`   Server running at ${server.url}`)

    const client = createOpencodeClient({ baseUrl: server.url })

    console.log("\n🔑 Setting API key...")
    await client.auth.set({
      providerID: PROVIDER_ID,
      auth: { type: "api", key: process.env.AICODEWITH_API_KEY },
    })

    const results: TestResult[] = []
    
    for (const model of activeModels) {
      const result = await testModel(client, model.id)
      results.push(result)
    }

    console.log("\n\n📊 Summary")
    console.log("==========")
    
    const passed = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`\n✅ Passed: ${passed.length}/${results.length}`)
    passed.forEach(r => {
      console.log(`   ${r.model} (${r.durationMs}ms)`)
    })
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
      failed.forEach(r => {
        console.log(`   ${r.model}: ${r.error}`)
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
