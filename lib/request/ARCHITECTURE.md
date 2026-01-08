<!--
📌 SELF-MAINTAINING: When this folder changes, update this file.
-->

# lib/request/ Architecture

**Request transformation, header management, and response handling.**

```
request/
├── fetch-helpers.ts       # URL extraction, header creation, response handling
├── request-transformer.ts # Body transformation, model normalization, reasoning config
├── response-handler.ts    # SSE→JSON conversion, content-type handling
└── helpers/
    ├── input-utils.ts     # Message filtering, orphaned tool output handling
    └── model-map.ts       # Model ID normalization mapping
```

---

## File Index

| File | Input | Output | Role |
|------|-------|--------|------|
| `fetch-helpers.ts` | Request, API key | Headers, transformed request | Entry point for request processing |
| `request-transformer.ts` | RequestBody | Transformed RequestBody | Model normalization, reasoning config, input filtering |
| `response-handler.ts` | SSE Response | JSON Response | Converts streaming SSE to JSON for non-streaming calls |
| `helpers/input-utils.ts` | InputItem[] | Filtered InputItem[] | Removes OpenCode prompts, fixes orphaned tool outputs |
| `helpers/model-map.ts` | Model ID string | Normalized model name | Maps config IDs to API model names |

---

## Data Flow

```
transformRequestForCodex(init)
  ├── Parse body JSON
  ├── normalizeModel() → helpers/model-map.ts
  ├── getCodexInstructions() → prompts/codex.ts
  └── transformRequestBody()
        ├── filterInput() → remove item_reference, strip IDs
        ├── filterOpenCodeSystemPrompts() → helpers/input-utils.ts
        ├── addCodexBridgeMessage() → prompts/codex-opencode-bridge.ts
        ├── normalizeOrphanedToolOutputs() → helpers/input-utils.ts
        └── Apply reasoning/text/include configs

handleSuccessResponse(response, isStreaming)
  ├── isStreaming=true  → Pass through SSE
  └── isStreaming=false → convertSseToJson() → response-handler.ts
```
