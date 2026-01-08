<!--
📌 SELF-MAINTAINING: When this folder changes, update this file.
-->

# lib/request/helpers/ Architecture

**Utility functions for input processing and model mapping.**

```
helpers/
├── input-utils.ts  # Message filtering, OpenCode prompt detection, orphaned outputs
└── model-map.ts    # Model ID → API model name mapping
```

---

## File Index

| File | Input | Output | Role |
|------|-------|--------|------|
| `input-utils.ts` | InputItem[], cached prompt | Filtered InputItem[] | Detects/removes OpenCode system prompts, converts orphaned tool outputs to messages |
| `model-map.ts` | Config model ID | Normalized API model name | Maps user-facing IDs (e.g., `gpt-5.2-codex-high`) to API names (e.g., `gpt-5.2-codex`) |

---

## Key Functions

**input-utils.ts:**
- `isOpenCodeSystemPrompt()` - Detect OpenCode's injected system prompts
- `filterOpenCodeSystemPromptsWithCachedPrompt()` - Remove/transform system prompts
- `normalizeOrphanedToolOutputs()` - Convert orphaned tool outputs to assistant messages

**model-map.ts:**
- `MODEL_MAP` - Static mapping of all supported model variants
- `getNormalizedModel()` - Lookup with case-insensitive fallback
- `isKnownModel()` - Check if model ID is recognized
