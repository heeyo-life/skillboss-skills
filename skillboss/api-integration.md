# Embedding API Hub in User Code

When building apps that need AI capabilities (image generation, TTS, chat, etc.), you can integrate SkillBoss API Hub directly into the user's code.

> **Tip:** Read `./scripts/api-hub.js` source code for detailed request formats and response parsing logic for each model type.

> **Important:** When integrating API Hub into a public-facing app, suggest to users that they may want to add authentication (login) and/or payment features to prevent unlimited consumption of their SkillBoss credits by anonymous visitors.

## When to Use
- User asks to "build an app with AI image generation"
- User wants "a website that generates audio/video"
- User needs "AI chat functionality in their app"
- Any project requiring AI API calls in the codebase

## API Format

**Base URL:** `https://api.heybossai.com/v1`
**Auth:** `Authorization: Bearer ${SKILLBOSS_API_KEY}`
**API Key:** Read from `skillboss/config.json` -> `apiKey` field

## Code Examples (TypeScript/JavaScript)

```typescript
// Environment variable setup
// Add to .env: SKILLBOSS_API_KEY=<key from skillboss/config.json>

const SKILLBOSS_API_KEY = process.env.SKILLBOSS_API_KEY
const API_BASE = 'https://api.heybossai.com/v1'

// ============================================================================
// PILOT -- Smart Model Navigator (recommended starting point)
// ============================================================================
async function pilot(body: object): Promise<any> {
  const response = await fetch(`${API_BASE}/pilot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify(body)
  })
  return response.json()
}

// Discover all types
const types = await pilot({ discover: true })

// Get ranked recommendations with docs
const reco = await pilot({ type: 'image', prefer: 'price', limit: 3 })

// One-shot execute (auto-select best model)
const result = await pilot({ type: 'image', inputs: { prompt: 'A cat' } })

// Multi-step workflow
const chain = await pilot({ chain: [{ type: 'stt' }, { type: 'chat', capability: 'summarize' }] })

// ============================================================================
// CHAT COMPLETION (direct call -- use when you know the exact model)
// ============================================================================
async function chat(prompt: string): Promise<string> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'bedrock/claude-4-5-sonnet', // or bedrock/claude-4-6-opus, openai/gpt-5, vertex/gemini-2.5-flash
      inputs: {
        messages: [{ role: 'user', content: prompt }]
      }
    })
  })
  const data = await response.json()

  // Response parsing - handle multiple formats
  const text = data.choices?.[0]?.message?.content  // OpenAI/Bedrock format
            || data.content?.[0]?.text               // Anthropic format
            || data.message?.content                 // Alternative format
  return text
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================
async function generateImage(prompt: string, size?: string): Promise<string> {
  const model = 'mm/img' // Default model, or use vertex/gemini-3-pro-image-preview

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model,
      inputs: {
        prompt,
        size: size || '1024*768'  // MM format: "width*height", default 4:3 landscape
      }
    })
  })
  const data = await response.json()

  // MM response format: {image_url: "https://..."}
  return data.image_url
}

// ============================================================================
// TEXT-TO-SPEECH
// ============================================================================
async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const model = 'minimax/speech-01-turbo' // or elevenlabs/eleven_multilingual_v2, openai/tts-1
  const [vendor] = model.split('/')

  // Request format varies by vendor
  let inputs: Record<string, unknown>
  if (vendor === 'elevenlabs') {
    inputs = { text, voice_id: 'EXAVITQu4vr4xnSDxMaL' }   // Rachel voice
  } else if (vendor === 'minimax') {
    inputs = { text, voice_setting: { voice_id: 'male-qn-qingse', speed: 1.0, vol: 1.0, pitch: 0 } }
  } else if (vendor === 'openai') {
    inputs = { input: text, voice: 'alloy' }
  } else {
    inputs = { text }
  }

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({ model, inputs })
  })

  // Response is binary audio data
  return response.arrayBuffer()
}

// ============================================================================
// SPEECH-TO-TEXT
// ============================================================================
async function speechToText(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  const base64Audio = Buffer.from(audioBuffer).toString('base64')

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'openai/whisper-1',
      inputs: {
        audio_data: base64Audio,
        filename  // e.g., "recording.mp3"
      }
    })
  })
  const data = await response.json()

  // Response: {text: "transcribed text here"}
  return data.text
}

// ============================================================================
// MUSIC GENERATION
// ============================================================================
async function generateMusic(prompt: string, duration?: number): Promise<string> {
  const model = 'replicate/elevenlabs/music' // or replicate/meta/musicgen, replicate/google/lyria-2

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model,
      inputs: {
        prompt,
        duration: duration || 30  // seconds
      }
    })
  })
  const data = await response.json()

  // Response: {audio_url: "https://...", duration_seconds: 30}
  return data.audio_url
}

// ============================================================================
// VIDEO GENERATION
// ============================================================================
// Text-to-video
async function generateVideo(prompt: string, duration?: number): Promise<string> {
  const model = 'mm/t2v' // Default for text-to-video

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model,
      inputs: {
        prompt,
        duration: duration || 5  // seconds
      }
    })
  })
  const data = await response.json()

  // MM response format: {video_url: "https://..."}
  return data.video_url
}

// Image-to-video
async function imageToVideo(prompt: string, imageUrl: string, duration?: number): Promise<string> {
  const model = 'mm/i2v' // Default for image-to-video

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model,
      inputs: {
        prompt,
        image: imageUrl,
        duration: duration || 5  // seconds
      }
    })
  })
  const data = await response.json()

  // MM response format: {video_url: "https://..."}
  return data.video_url
}

// ============================================================================
// DOCUMENT PROCESSING
// ============================================================================
async function parseDocument(url: string): Promise<object> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'reducto/parse',
      inputs: { document_url: url }
    })
  })
  return response.json()
  // Response: { result: { blocks: [...], ... }, usage: { credits: N } }
}

// ============================================================================
// SMS VERIFICATION (Prelude)
// ============================================================================
// Step 1: Send OTP code
async function sendVerificationCode(phoneNumber: string, ip?: string): Promise<object> {
  const inputs: Record<string, unknown> = {
    target: { type: 'phone_number', value: phoneNumber }
  }
  if (ip) inputs.signals = { ip }

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({ model: 'prelude/verify-send', inputs })
  })
  return response.json()
  // Response: { id: "vrf_...", status: "success", method: "message", channels: ["sms"] }
}

// Step 2: Verify OTP code
async function checkVerificationCode(phoneNumber: string, code: string): Promise<object> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'prelude/verify-check',
      inputs: {
        target: { type: 'phone_number', value: phoneNumber },
        code
      }
    })
  })
  return response.json()
  // Response: { id: "vrf_...", status: "success" }  (or "failure" / "expired_or_not_found")
}

// Send SMS notification (requires template configured in Prelude dashboard)
async function sendSmsNotification(phoneNumber: string, templateId: string, variables?: Record<string, string>): Promise<object> {
  const inputs: Record<string, unknown> = {
    template_id: templateId,
    to: phoneNumber
  }
  if (variables) inputs.variables = variables

  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({ model: 'prelude/notify-send', inputs })
  })
  return response.json()
}

async function extractFromDocument(url: string, schema: object): Promise<object> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SKILLBOSS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'reducto/extract',
      inputs: {
        document_url: url,
        instructions: { schema }  // JSON Schema for fields to extract
      }
    })
  })
  return response.json()
  // Response: { result: { ...extracted fields }, usage: { credits: N } }
}
```

## Response Format Summary

| Type | Model Examples | Response Location |
|------|----------------|-------------------|
| Chat | bedrock/claude-*, openai/gpt-* | `choices[0].message.content` or `content[0].text` |
| Image | mm/img | `image_url` |
| Image | vertex/gemini-3-pro-image-preview | `generated_images[0]` |
| Image | replicate/flux-* | `data[0]` (array of URLs) |
| TTS | minimax/speech-01-turbo, elevenlabs/* | Binary audio (use `response.arrayBuffer()`) |
| STT | openai/whisper-1 | `text` |
| Music | replicate/elevenlabs/music, replicate/meta/musicgen | `audio_url` |
| Video | mm/t2v, mm/i2v | `video_url` |
| Video | vertex/veo-* | `generatedSamples[0].video.uri` or `videos[0]` |
| Document | reducto/parse | `result` (parsed markdown), `usage.credits` |
| Document | reducto/extract | `result` (extracted fields), `usage.credits` |
| SMS Verify | prelude/verify-send | `id`, `status`, `method`, `channels` |
| SMS Check | prelude/verify-check | `id`, `status` ("success", "failure", "expired_or_not_found") |
| SMS Notify | prelude/notify-send | Provider response |
| CEO Feed | ceointerviews/get_feed | `count`, `results[]` (item_title, transcript, entity_name, publish_date, source_url) |
| CEO Quotes | ceointerviews/get_quotes | `count`, `results[]` (id, quote, entity, is_notable, is_controversial, topics_mentioned) |

## Setup Steps

1. Run `./cli/skillboss auth trial` or `./cli/skillboss auth login` to get an API key
2. The key is auto-saved to `~/.config/skillboss/credentials.json` and exported as `SKILLBOSS_API_KEY`
3. For app code, add `SKILLBOSS_API_KEY` to your project's `.env` file
4. Use the code patterns above, adjusting for your specific model
