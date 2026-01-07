# Install & Configure OpenCode with AICodeWith Auth

You are an LLM agent.
Your task is to set up **OpenCode** with **opencode-aicodewith-auth** plugin using **AICodeWith** as the authentication provider.

You MUST follow the steps **in order**. DO NOT skip any step.

---

## Step 0 — Ask for AICodeWith API Key (MANDATORY, DO NOT SKIP)

Ask the user **exactly** this (keep the wording natural, but the meaning must be preserved):

> **"你现在有没有 AICodeWith 的 API key？"**
>
> - 如果已经有了，请直接发给我
> - 如果还没有，请去 **https://aicodewith.com/** 注册（按住 Command 点击链接可直接跳转），注册后会有免费体验额度
>
> 请告诉我你的情况，我会继续帮你配置。

### Branching rules (IMPORTANT)

### Case A — User HAS a key

- User provides the key (format: `sk-...` or similar).
- Store it temporarily as: `AICODEWITH_API_KEY`.
- Continue to **Step 1**.

### Case B — User DOES NOT have a key

The link **https://aicodewith.com/** is already provided above. Just wait for the user to register and come back with their key.

**Rules:**
- DO NOT proceed with installation until the user confirms they have obtained a key.
- DO NOT fabricate or guess a key.
- Wait patiently for the user to respond.

Only continue when the user explicitly provides an AICodeWith API key.

---

## Step 1 — Check if OpenCode is installed

Run:

```bash
which opencode || command -v opencode
```

### If OpenCode is NOT installed

Guide the user to install OpenCode first:

**macOS (Homebrew):**
```bash
brew install opencode
```

**npm:**
```bash
npm install -g opencode-ai
```

**Other methods:** See https://opencode.ai/docs

After installation, verify:
```bash
opencode --version
```

### If OpenCode IS installed

Continue to **Step 2**.

---

## Step 2 — Authenticate with OpenCode CLI

Run the authentication command:

```bash
opencode auth login
```

When prompted:

1. Select **other**
2. Enter provider name: `aicodewith`
3. Enter the API Key (the one user provided in Step 0)
4. Press Enter to confirm

After successful authentication, continue to **Step 3**.

**Note:** This stores the key in `~/.local/share/opencode/auth.json` automatically. You do NOT need to manually edit this file.

---

## Step 3 — Configure OpenCode to use the plugin

Target path:
- **Global config:** `~/.config/opencode/opencode.json`
- **Project config:** `./opencode.json` (in current directory)

### 3.1 Ensure config directory exists

```bash
mkdir -p ~/.config/opencode
```

### 3.2 Read existing opencode.json (if exists)

If `opencode.json` exists:
- Read and parse it as JSON.
- Preserve all existing configuration.

If it does NOT exist:
- Start with this base structure:
```json
{
  "$schema": "https://opencode.ai/config.json"
}
```

### 3.3 Add plugin to configuration

Ensure the `plugin` array includes `opencode-aicodewith-auth`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

**Merge rules:**
- If `plugin` array exists → append `"opencode-aicodewith-auth"` if not already present
- If `plugin` does not exist → create the array with `["opencode-aicodewith-auth"]`
- **NEVER remove existing plugins**

---

## Step 4 — Verify installation

Tell the user:

> "Installation complete! Please restart OpenCode to load the plugin.
> You can now use any of these models:
> - `gpt-5.2-codex`
> - `gpt-5.2`
> - `claude-sonnet-4-5-20250929`
> - `claude-opus-4-5-20251101`
> - `gemini-3-pro-high`
>
> To test, run: `opencode --model gpt-5.2-codex`"

Or in Chinese:

> "安装完成！请重启 OpenCode 以加载插件。
> 你现在可以使用以下模型：
> - `gpt-5.2-codex`
> - `gpt-5.2`
> - `claude-sonnet-4-5-20250929`
> - `claude-opus-4-5-20251101`
> - `gemini-3-pro-high`
>
> 测试命令: `opencode --model gpt-5.2-codex`"

---

## Summary of changes

| Action | Description |
|--------|-------------|
| `opencode auth login` | Stores AICodeWith API key |
| `~/.config/opencode/opencode.json` | Registers the plugin |

---

## Troubleshooting

If the user reports issues:

### "Provider not found: aicodewith"
- Verify `opencode.json` contains `"plugin": ["opencode-aicodewith-auth"]`
- Ask user to restart OpenCode

### "Authentication failed"
- Verify `auth.json` has correct key format
- Ask user to double-check their API key at https://aicodewith.com/

### "Model not found"
- The plugin auto-injects models on first load
- Ask user to restart OpenCode and try again

---

## Important rules for the AI agent

1. **NEVER skip Step 0** — Always ask for the API key first
2. **NEVER fabricate API keys** — Only use what the user provides
3. **NEVER delete existing config** — Always merge, never overwrite entirely
4. **ALWAYS verify file writes** — Re-read after writing to confirm valid JSON
5. **ALWAYS wait for user confirmation** — Don't assume, ask when unclear
