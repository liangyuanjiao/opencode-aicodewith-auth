<!--
📌 SELF-MAINTAINING: When this folder changes, update this file.
-->

# lib/prompts/ Architecture

**Codex prompt fetching, caching, and OpenCode environment bridging.**

```
prompts/
├── codex.ts                 # Fetch & cache Codex instructions from GitHub
├── opencode-codex.ts        # Fetch & cache OpenCode's codex.txt
├── codex-opencode-bridge.ts # Bridge prompt for Codex→OpenCode tool mapping
└── fallback-instructions.txt # Fallback when GitHub fetch fails
```

---

## File Index

| File | Input | Output | Role |
|------|-------|--------|------|
| `codex.ts` | Model name | Codex system prompt | Fetches model-specific prompts from openai/codex repo |
| `opencode-codex.ts` | - | OpenCode codex.txt | Fetches OpenCode's system prompt for filtering |
| `codex-opencode-bridge.ts` | - | Bridge prompt constant | Tool remapping rules (apply_patch→edit, etc.) |
| `fallback-instructions.txt` | - | Static prompt | Used when GitHub fetch fails |

---

## Data Flow

```
getCodexInstructions(model)
  ├── Determine model family (gpt-5.3-codex, gpt-5.2-codex, codex, gpt-5.1, etc.)
  ├── Check cache (15min TTL)
  ├── Fetch from GitHub with ETag
  └── Return prompt (or fallback)

filterOpenCodeSystemPrompts(input)
  ├── getOpenCodeCodexPrompt() → cached OpenCode prompt
  └── Remove/replace matching system messages
```
