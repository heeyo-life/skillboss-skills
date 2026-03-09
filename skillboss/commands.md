# Commands Reference

> **Use `pilot` first (see SKILL.md).** These commands are for when you already have a model ID from pilot's recommendations.

These examples assume you are in your AI tool's skills directory (the folder containing `skillboss/`).

## Direct Model Calls

### Chat:
```bash
node ./scripts/api-hub.js chat --model MODEL_ID --prompt "Hello" --stream
```

### Image:
```bash
node ./scripts/api-hub.js image --prompt "A sunset" --output /tmp/sunset.png
```

### Video:
```bash
node ./scripts/api-hub.js video --prompt "A cat playing" --output /tmp/cat.mp4
```

### Music:
```bash
node ./scripts/api-hub.js music --prompt "upbeat electronic" --output /tmp/music.mp3
```

### TTS:
```bash
node ./scripts/api-hub.js tts --model MODEL_ID --text "Hello" --output /tmp/hello.mp3
```

### STT:
```bash
node ./scripts/api-hub.js stt --file recording.mp3
```

### Upscale / Img2Img:
```bash
node ./scripts/api-hub.js upscale --image-url "https://example.com/photo.jpg" --output /tmp/upscaled.png
node ./scripts/api-hub.js img2img --image-url "https://example.com/photo.jpg" --prompt "watercolor" --output /tmp/result.jpg
```

### Document processing:
```bash
node ./scripts/api-hub.js document --model MODEL_ID --url "https://example.com/doc.pdf"
```

### Search / Scrape / Linkup:
```bash
node ./scripts/api-hub.js linkup-search --query "latest AI news"
node ./scripts/api-hub.js linkup-fetch --url "https://example.com"
```

### SMS / Email:
```bash
node ./scripts/api-hub.js sms-verify --phone "+1234567890"
node ./scripts/api-hub.js send-email --to "user@example.com" --subject "Hello" --body "<p>Hi!</p>"
```

### Generic run:
```bash
node ./scripts/api-hub.js run --model MODEL_ID --inputs '{"key":"value"}'
```

### Deploy:
```bash
node ./scripts/serve-build.js publish-static ./dist
node ./scripts/serve-build.js publish-worker ./worker
node ./scripts/stripe-connect.js
```

## Full Commands Table

| Command | Description | Key Options |
|---------|-------------|-------------|
| **`pilot`** | **Smart model selector -- auto-picks best model (RECOMMENDED)** | `--type`, `--prompt`/`--text`/`--file`, `--discover`, `--prefer`, `--output` |
| `chat` | Chat completions | `--model`, `--prompt`/`--messages`, `--system`, `--stream` |
| `tts` | Text-to-speech | `--model`, `--text`, `--voice-id`, `--output` |
| `stt` | Speech-to-text | `--file`, `--model`, `--language`, `--output` |
| `image` | Image generation | `--prompt`, `--size`, `--output`, `--model` |
| `upscale` | Image upscaling | `--image-url`, `--scale`, `--output` |
| `img2img` | Image-to-image transformation | `--image-url`, `--prompt`, `--strength`, `--output` |
| `video` | Video generation | `--prompt`, `--output`, `--image`, `--duration`, `--model` |
| `music` | Music generation | `--prompt`, `--duration`, `--output`, `--model` |
| `search` | Web search | `--model`, `--query` |
| `linkup-search` | Structured web search | `--query`, `--output-type`, `--depth` |
| `linkup-fetch` | URL-to-markdown fetcher | `--url`, `--render-js` |
| `scrape` | Web scraping | `--model`, `--url`/`--urls` |
| `document` | Document processing | `--model`, `--url`, `--schema`, `--output` |
| `gamma` | Presentations | `--model`, `--input-text` |
| `sms-verify` | Send OTP verification code | `--phone` |
| `sms-check` | Check OTP verification code | `--phone`, `--code` |
| `sms-send` | Send SMS notification | `--phone`, `--template-id` |
| `send-email` | Single email | `--to`, `--subject`, `--body` |
| `send-batch` | Batch emails | `--receivers`, `--subject`, `--body` |
| `publish-static` | Publish to R2 | `<folder>`, `--project-id` |
| `publish-worker` | Deploy Worker | `<folder>`, `--main`, `--name` |
| `stripe-connect` | Connect Stripe | `--status` |
| `run` | Generic endpoint (any model by ID) | `--model`, `--inputs`, `--stream`, `--output` |
| `list-models` | List available models | `--type`, `--vendor` |
| `version` | Check for updates | (none) |

## Discover Models

Use `pilot --discover` to browse all available models, or `pilot --discover --keyword "search term"` to search.

```bash
node ./scripts/api-hub.js pilot --discover
node ./scripts/api-hub.js pilot --discover --keyword "CEO"
node ./scripts/api-hub.js list-models --type chat
```

## Email Examples

### Single email:
```bash
node ./scripts/api-hub.js send-email --to "a@b.com,c@d.com" --subject "Update" --body "<p>Content here</p>"
```

### Batch with templates:
```bash
node ./scripts/api-hub.js send-batch \
  --subject "Hi {{name}}" \
  --body "<p>Hello {{name}}, order #{{order_id}} ready.</p>" \
  --receivers '[{"email":"alice@b.com","variables":{"name":"Alice","order_id":"123"}}]'
```
