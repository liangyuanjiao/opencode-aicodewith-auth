# AGENTS.md - AI Agent Guidelines

> OpenCode plugin for AICodewith authentication - routes requests to GPT-5.x, Claude, Gemini APIs.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Build (Bun bundler, ESM output)
bun run build

# Type check only (no emit)
bun run typecheck
# or: bunx tsc --noEmit

# Clean build artifacts
bun run clean

# Full rebuild
bun run clean && bun run build
```

**No test framework configured.** This is a plugin library - validation happens via type checking and manual integration testing.

## Project Structure

```
opencode-aicodewith-auth/
├── index.ts              # Plugin entry: auth hook, config injection, fetch interceptor
├── provider.ts           # Multi-provider factory (OpenAI/Anthropic/Google SDKs)
├── lib/
│   ├── constants.ts      # URLs, header names, provider IDs
│   ├── types.ts          # Shared TypeScript interfaces
│   ├── logger.ts         # Debug/request logging utilities
│   ├── prompts/          # Codex prompt fetching & bridging
│   ├── request/          # Request transformation & response handling
│   └── hooks/            # Auto-update, OMO config sync
└── scripts/              # Installation automation
```

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ES2022 with Bundler resolution
- **Strict mode**: Enabled (`"strict": true`)
- **No implicit any**: Enforced by strict mode

### Import Conventions

```typescript
// 1. External packages first (node:*, @ai-sdk/*, @opencode-ai/*)
import type { Plugin, PluginInput } from "@opencode-ai/plugin"
import { mkdir, readFile } from "node:fs/promises"

// 2. Internal imports with relative paths
import { HEADER_NAMES, PROVIDER_ID } from "./lib/constants"
import type { RequestBody, InputItem } from "./lib/types"
```

**Rules:**
- Use `type` imports for type-only imports: `import type { X } from "..."`
- Node.js built-ins use `node:` prefix: `node:fs/promises`, `node:path`, `node:os`
- No barrel exports - import directly from source files
- Relative paths for internal imports (no path aliases)

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `fetch-helpers.ts`, `request-transformer.ts` |
| Constants | SCREAMING_SNAKE_CASE | `PROVIDER_ID`, `HEADER_NAMES`, `CODEX_BASE_URL` |
| Functions | camelCase | `createAicodewithHeaders`, `transformRequestBody` |
| Types/Interfaces | PascalCase | `RequestBody`, `ConfigOptions`, `AicodewithProvider` |
| Local variables | camelCase | `apiKey`, `normalizedModel`, `isStreaming` |

### Type Definitions

```typescript
// Interfaces for object shapes
export interface ConfigOptions {
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
  reasoningSummary?: "auto" | "concise" | "detailed" | "off" | "on"
}

// Type aliases for unions/primitives
export type AicodewithProvider = {
  (modelId: string): LanguageModelV2
  chat(modelId: string): LanguageModelV2
}

// Use `as const` for literal object constants
export const HEADER_NAMES = {
  AUTHORIZATION: "authorization",
  USER_AGENT: "user-agent",
} as const
```

### Error Handling

```typescript
// Pattern 1: Silent catch with fallback (for non-critical operations)
try {
  const body = JSON.parse(init.body as string) as RequestBody
} catch {
  return undefined
}

// Pattern 2: Catch with warning log (for background operations)
syncOmoConfig().catch((error) => {
  console.warn(
    `[${PACKAGE_NAME}] Failed to sync: ${error instanceof Error ? error.message : error}`
  )
})

// Pattern 3: Type-safe error handling
try {
  writeFileSync(filename, content)
} catch (e) {
  const error = e as Error
  console.error(`[${PLUGIN_NAME}] Failed:`, error.message)
}
```

**Rules:**
- Empty catch blocks `catch {}` are acceptable for truly optional operations
- Always type errors as `Error` when accessing `.message`
- Use `console.warn` for non-fatal issues, `console.error` for failures
- Prefix logs with `[package-name]` for traceability

### Function Patterns

```typescript
// Arrow functions for simple utilities
const isCodexModel = (model: string | undefined) =>
  Boolean(model && CODEX_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)))

// Regular functions for exports and complex logic
export function createAicodewithHeaders(
  init: RequestInit | undefined,
  apiKey: string,
  opts?: { promptCacheKey?: string },
): Headers {
  // ...
}

// Async functions with explicit return types
export async function transformRequestBody(
  body: RequestBody,
  codexInstructions: string,
): Promise<RequestBody> {
  // ...
}
```

### File Header Convention

Each source file should have a JSDoc header:

```typescript
/**
 * @file filename.ts
 * @input  What this module receives
 * @output What this module produces
 * @pos    Role in the architecture
 *
 * 📌 On change: Update this header + relevant ARCHITECTURE.md
 */
```

## Formatting

- **No semicolons** (omit trailing semicolons)
- **Double quotes** for strings
- **2-space indentation**
- **Trailing commas** in multiline structures
- **No trailing whitespace**

```typescript
// Correct
const config = {
  name: "opencode-aicodewith-auth",
  version: "0.1.32",
}

// Incorrect
const config = {
  name: 'opencode-aicodewith-auth';
  version: '0.1.32';
};
```

## Architecture Notes

### Request Flow

```
User Request → OpenCode → Plugin Auth Hook → Route by Model:
  ├── gpt-*/codex-* → Codex API (transform + headers)
  ├── claude-*      → Anthropic API (URL rewrite)
  └── gemini-*      → Gemini API (headers + URL build)
```

### Key Patterns

1. **URL Rewriting**: `rewriteUrl()` handles base URL substitution
2. **Header Management**: Provider-specific headers via `createAicodewithHeaders()`, `createGeminiHeaders()`
3. **Request Transformation**: `transformRequestBody()` normalizes models, filters input, adds reasoning config
4. **Response Handling**: SSE-to-JSON conversion for non-streaming requests

### Dependencies

- `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai` - Provider SDKs
- `@ai-sdk/provider`, `@ai-sdk/provider-utils` - SDK utilities
- `@opencode-ai/plugin` - Plugin interface (peer dependency)

## Prohibited Patterns

- **No `as any`** - Use proper typing or `unknown` with type guards
- **No `@ts-ignore` / `@ts-expect-error`** - Fix the type issue
- **No CommonJS** - ESM only (`"type": "module"`)
- **No default exports** except for plugin entry (`export default AicodewithCodexAuthPlugin`)
