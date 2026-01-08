<!--
📌 SELF-MAINTAINING: When this folder changes, update this file.
-->

# lib/ Architecture

**Core library modules for request transformation, prompt management, and utilities.**

```
lib/
├── constants.ts     # Global constants (URLs, headers, IDs)
├── types.ts         # Shared TypeScript interfaces
├── logger.ts        # Debug/request logging utilities
├── prompts/         # Codex prompt fetching & OpenCode bridging
└── request/         # Request transformation & response handling
```

---

## File Index

| File | Input | Output | Role |
|------|-------|--------|------|
| `constants.ts` | - | URLs, header names, provider IDs | Global configuration constants |
| `types.ts` | - | TypeScript interfaces | Shared type definitions |
| `logger.ts` | Log data | File/console logs | Debug & request logging |
| `prompts/` | Model name | System prompts | See [prompts/ARCHITECTURE.md](prompts/ARCHITECTURE.md) |
| `request/` | Raw request | Transformed request/response | See [request/ARCHITECTURE.md](request/ARCHITECTURE.md) |

---

## Dependencies

```
constants.ts ← logger.ts, request/*, prompts/*
types.ts     ← request/*, prompts/*
logger.ts    ← request/*
```
