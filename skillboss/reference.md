# SkillBoss Reference

Complete model list and detailed parameter documentation.

## All Supported Models

### Chat Completions

**Bedrock (AWS Claude):**
- `bedrock/claude-4-6-opus` - Claude 4.6 Opus (most powerful, 1M context, recommended for complex tasks)
- `bedrock/claude-4-5-opus` - Claude 4.5 Opus (powerful reasoning model)
- `bedrock/claude-4-5-sonnet` - Claude 4.5 Sonnet (balanced performance and cost)
- `bedrock/claude-4-5-haiku` - Claude 4.5 Haiku (fastest, for simple tasks)
- `bedrock/claude-4-sonnet` - Claude 4 Sonnet
- `bedrock/claude-3-7-sonnet` - Claude 3.7 Sonnet
- `bedrock/claude-3-5-sonnet` - Claude 3.5 Sonnet (v2)

**OpenAI:**
- `openai/gpt-5` - GPT-5 latest
- `openai/gpt-5-mini` - GPT-5 Mini
- `openai/gpt-4.1` - GPT-4.1
- `openai/gpt-4.1-mini` - GPT-4.1 Mini
- `openai/gpt-4o` - GPT-4o multimodal
- `openai/gpt-4o-mini` - GPT-4o Mini (fast and economical)
- `openai/o4-mini` - O4 Mini reasoning model
- `openai/o3-mini` - O3 Mini reasoning model
- `openai/o1` - O1 advanced reasoning

**OpenRouter:**
- `openrouter/deepseek/deepseek-r1` - DeepSeek R1
- `openrouter/deepseek/deepseek-r1:online` - DeepSeek R1 Online
- `openrouter/anthropic/claude-sonnet-4:nitro` - Claude Sonnet 4 Nitro
- `openrouter/anthropic/claude-3.7-sonnet` - Claude 3.7 Sonnet
- `openrouter/google/gemini-2.5-pro-preview` - Gemini 2.5 Pro
- `openrouter/qwen/qwen3-coder-plus` - Qwen 3 Coder Plus
- `openrouter/moonshotai/kimi-k2-thinking` - Kimi K2 Thinking

**Vertex (Google Cloud):**
- `vertex/gemini-2.5-pro` - Gemini 2.5 Pro
- `vertex/gemini-2.5-flash` - Gemini 2.5 Flash (快速)
- `vertex/gemini-2.5-flash-lite-preview-06-17` - Gemini 2.5 Flash Lite
- `vertex/gemini-3-pro-preview` - Gemini 3 Pro Preview
- `vertex/gemini-3-flash-preview` - Gemini 3 Flash Preview
- `vertex/codestral-2501` - Mistral Codestral

**Anthropic (Direct):**
- `anthropic/claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet

**Minimax:**
- `minimax/abab6.5s-chat` - Chinese optimized (fast)
- `minimax/abab6.5g-chat` - Chinese optimized (general)

**Perplexity:**
- `perplexity/sonar-pro` - AI search (with citations)
- `perplexity/sonar` - AI search

### Text-to-Speech

**ElevenLabs:**
- `elevenlabs/eleven_multilingual_v2` - 29 languages, highest quality
- `elevenlabs/sound_generation` - Sound effects generation

**Minimax:**
- `minimax/speech-01-turbo` - Chinese TTS optimized

**OpenAI:**
- `openai/tts-1` - Standard quality
- `openai/tts-1-hd` - HD quality

**Replicate:**
- `replicate/lucataco/xtts-v2` - XTTS v2

### Image Generation

**Vertex (Recommended):**
- `vertex/gemini-2.5-flash-image-preview` - Gemini 2.5 Flash Image (preferred)
- `vertex/gemini-3-pro-image-preview` - Gemini 3 Pro Image

**Replicate:**
- `replicate/black-forest-labs/flux-schnell` - Fast generation
- `replicate/black-forest-labs/flux-dev` - High quality
- `replicate/lucataco/remove-bg` - Background removal
- `replicate/851-labs/background-remover` - Background removal v2

### Video Generation

- `vertex/veo-3.1-fast-generate-preview` - Google Veo 3.1

### Music Generation

- `replicate/elevenlabs/music` - ElevenLabs Music, high-quality with natural vocals
- `replicate/google/lyria-2` - Google Lyria 2, DeepMind's advanced music AI
- `replicate/meta/musicgen` - Meta MusicGen, open-source, diverse styles (recommended)
- `replicate/stability-ai/stable-audio-2.5` - Stable Audio 2.5, up to 3 minutes

### Web Search

- `perplexity/sonar-pro` - AI search with citations
- `perplexity/sonar` - AI search
- `scrapingdog/google_search` - Google search results

### Web Scraping

**Firecrawl:**
- `firecrawl/scrape` - Single page scraping
- `firecrawl/extract` - AI structured extraction
- `firecrawl/map` - Website sitemap

**ScrapingDog:**
- `scrapingdog/screenshot` - Web page screenshot
- `scrapingdog/google_search` - Google search
- `scrapingdog/google_images` - Google images
- `scrapingdog/google_news` - Google news
- `scrapingdog/amazon_product` - Amazon product
- `scrapingdog/amazon_search` - Amazon search
- `scrapingdog/linkedin_person` - LinkedIn profile
- `scrapingdog/linkedin_company` - LinkedIn company
- `scrapingdog/youtube_search` - YouTube search

### Presentations

- `gamma/generation` - AI presentation generation

### Embeddings

- `openai/text-embedding-3-small` - Small embeddings
- `openai/text-embedding-3-large` - Large embeddings

### Speech-to-Text

- `openai/whisper-1` - Audio to text

---

## Detailed Command Parameters

### chat

Chat completions with any supported model.

```bash
node ./skillboss/scripts/api-hub.js chat [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Model identifier (e.g., `bedrock/claude-4-5-sonnet`) |
| `--prompt` | Yes* | Single message prompt |
| `--messages` | Yes* | JSON array of messages `[{"role":"user","content":"..."}]` |
| `--system` | No | System prompt |
| `--stream` | No | Enable streaming output |
| `--max-tokens` | No | Maximum tokens in response |
| `--temperature` | No | Sampling temperature (0-2) |

*Either `--prompt` or `--messages` required.

### tts

Text-to-speech audio generation.

```bash
node ./skillboss/scripts/api-hub.js tts [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Model identifier |
| `--text` | Yes | Text to convert to speech |
| `--output` | No | Output file path (default: auto-generated) |
| `--voice-id` | No | Voice ID (ElevenLabs specific) |

### image

Image generation from text prompts.

```bash
node ./skillboss/scripts/api-hub.js image [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Model identifier |
| `--prompt` | Yes | Image description |
| `--output` | No | Output file path |
| `--size` | No | Image size (e.g., `1024x1024`) |
| `--quality` | No | Quality setting (model-specific) |

### video

Video generation from text prompts.

```bash
node ./skillboss/scripts/api-hub.js video [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Model identifier |
| `--prompt` | Yes | Video description |
| `--output` | No | Output file path |

### music

Music generation from text prompts.

```bash
node ./skillboss/scripts/api-hub.js music [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | No | Model identifier (default: `replicate/elevenlabs/music`) |
| `--prompt` | Yes | Music description |
| `--duration` | No | Duration in seconds |
| `--output` | No | Output file path |

### search

Web search queries.

```bash
node ./skillboss/scripts/api-hub.js search [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Search provider model |
| `--query` | Yes | Search query string |

### scrape

Web page scraping.

```bash
node ./skillboss/scripts/api-hub.js scrape [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Scraping provider model |
| `--url` | Yes* | Single URL to scrape |
| `--urls` | Yes* | JSON array of URLs |

*Either `--url` or `--urls` required.

### send-email

Send a single email.

```bash
node ./skillboss/scripts/api-hub.js send-email [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--to` | Yes | Recipient emails, comma-separated |
| `--subject` | Yes | Email subject |
| `--body` | Yes | HTML email body |
| `--reply-to` | No | Reply-to addresses, comma-separated |

### send-batch

Send templated batch emails.

```bash
node ./skillboss/scripts/api-hub.js send-batch [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--subject` | Yes | Subject with `{{var}}` placeholders |
| `--body` | Yes | HTML body with `{{var}}` placeholders |
| `--receivers` | Yes | JSON array: `[{"email":"...","variables":{...}}]` |
| `--reply-to` | No | Reply-to addresses |

### publish-static

Upload static files to R2 storage and deploy.

```bash
node ./skillboss/scripts/serve-build.js publish-static <folder> [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `<folder>` | Yes | Path to folder with static files |
| `--project-id` | No | Project identifier (auto-generated if omitted) |
| `--version` | No | Version number for deployments |
| `--api-url` | No | Override build API URL |

### publish-worker

Upload and deploy a Cloudflare Worker with bindings.

```bash
node ./skillboss/scripts/serve-build.js publish-worker <folder> [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `<folder>` | Yes | Path to Worker source folder |
| `--main` | No | Entry point file (auto-detected: `src/index.ts`, `index.js`, etc.) |
| `--name` | No | Worker name (default: folder name) |
| `--project-id` | No | Project identifier (auto-generated if omitted) |
| `--version` | No | Version number for deployments |
| `--api-url` | No | Override build API URL |

**Automatic Configuration:**
If `wrangler.toml` exists in the folder, the following are auto-detected:
- Entry point (`main`)
- Worker name (`name`)
- D1 databases (`[[d1_databases]]`)
- KV namespaces (`[[kv_namespaces]]`)
- R2 buckets (`[[r2_buckets]]`)
- Environment variables (`[vars]`)

**Example wrangler.toml:**
```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"

[[kv_namespaces]]
binding = "CACHE"

[vars]
API_VERSION = "1.0"
```

**SQL Migrations:**

Place SQL files in a `migrations/` folder or a single `schema.sql` in the root:

```
my-worker/
├── src/
│   └── index.ts
├── migrations/
│   ├── 001_init.sql       # Creates tables
│   └── 002_add_index.sql  # Additional migrations
├── wrangler.toml
└── package.json
```

Or use a single schema file:
```
my-worker/
├── src/
│   └── index.ts
├── schema.sql             # All table definitions
├── wrangler.toml
└── package.json
```

Migration files are executed in alphabetical order after D1 databases are provisioned. Example `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### stripe-connect

Connect a Stripe Express account for accepting payments.

```bash
node ./skillboss/scripts/stripe-connect.js [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--status` | No | Only check current account status |
| `--no-browser` | No | Don't auto-open browser (print URL instead) |

**Flow:**
1. Checks if Stripe account is already connected
2. If not, creates a Stripe Express account
3. Opens browser for Stripe's onboarding (KYC, bank verification)
4. Polls until onboarding is complete
5. Your `stripe_account_id` is stored for use with e-commerce Workers

### run

Generic endpoint access for any API Hub endpoint.

```bash
node ./skillboss/scripts/api-hub.js run [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--model` | Yes | Full endpoint model path |
| `--inputs` | Yes | JSON object with endpoint-specific inputs |
| `--stream` | No | Enable streaming |
| `--output` | No | Output file path |

---

## Configuration File

`./skillboss/config.json`:

```json
{
  "apiKey": "your-api-hub-key",
  "sender": "auto-determined",
  "baseUrl": "https://api.heybossai.com/v1",
  "buildApiUrl": "https://build.skillbossai.com",
  "stripeConnectUrl": "https://heyboss.ai"
}
```

| Field | Description |
|-------|-------------|
| `apiKey` | Your SkillBoss API Hub key (injected automatically) |
| `sender` | Email sender (auto-determined from user: `name@name.skillboss.live`) |
| `baseUrl` | API Hub endpoint |
| `buildApiUrl` | Build service for static/Worker uploads |
| `stripeConnectUrl` | Stripe Connect API endpoint (for payment setup) |
