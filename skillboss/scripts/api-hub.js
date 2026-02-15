#!/usr/bin/env node

/**
 * SkillBoss API Hub - Multi-Provider API Gateway Client
 *
 * Provides unified access to multiple AI/ML providers:
 * - Chat: bedrock, openai, openrouter, vertex, anthropic, minimax, perplexity, huggingface
 * - TTS: elevenlabs, minimax, openai, replicate
 * - Image: vertex/gemini-3-pro-image-preview, replicate/flux, fal/img2img, huggingface
 * - Upscale: fal/upscale (creative-upscaler)
 * - Search: scrapingdog, perplexity, firecrawl, linkup (structured search + fetch)
 * - Video: minimax, huggingface
 * - STT: openai/whisper-1, huggingface (speech-to-text)
 * - Embedding: huggingface
 * - Document: reducto (parse, extract, split, edit)
 * - SMS/Verify: prelude (OTP send/check, notify)
 * - Email: aws/ses
 *
 * HuggingFace Dynamic Routing:
 * - Any model on huggingface.co works as "huggingface/{org}/{model}" without pre-registration
 * - Chat: node api-hub.js chat --model "huggingface/meta-llama/Llama-3-8B-Instruct" --prompt "Hello"
 * - Other tasks via /run: --inputs '{"task":"embedding"}' or '{"task":"image"}' etc.
 *
 * Usage:
 *   node api-hub.js run --model "vendor/model" --inputs '{"key":"value"}' [--stream] [--output file]
 *   node api-hub.js chat --model "bedrock/claude-4-sonnet" --prompt "Hello" [--system "..."] [--stream]
 *   node api-hub.js tts --model "elevenlabs/eleven_multilingual_v2" --text "Hello" --output audio.mp3
 *   node api-hub.js image --model "vertex/gemini-3-pro-image-preview" --prompt "A sunset" [--output image.png]
 *   node api-hub.js image --model "replicate/black-forest-labs/flux-schnell" --prompt "A sunset" [--output image.png]
 *   node api-hub.js upscale --image-url "https://example.com/photo.jpg" [--scale 2] [--output upscaled.png]
 *   node api-hub.js img2img --image-url "https://example.com/photo.jpg" --prompt "watercolor painting" [--output result.jpg]
 *   node api-hub.js search --model "scrapingdog/google_search" --query "nodejs"
 *   node api-hub.js linkup-search --query "latest AI news" [--output-type searchResults|sourcedAnswer|structured] [--depth standard|deep]
 *   node api-hub.js linkup-fetch --url "https://example.com" [--render-js]
 *   node api-hub.js scrape --model "firecrawl/scrape" --url "https://example.com"
 *   node api-hub.js stt --file recording.mp3 [--model "openai/whisper-1"] [--prompt "..."] [--language "en"] [--output transcript.txt]
 *   node api-hub.js sms-verify --phone "+1234567890"
 *   node api-hub.js sms-check --phone "+1234567890" --code "123456"
 *   node api-hub.js sms-send --phone "+1234567890" --template-id "your_template_id"
 *   node api-hub.js send-email --to "a@b.com" --subject "Subject" --body "<html>...</html>"
 *   node api-hub.js send-batch --subject "Hello {{name}}" --body "<html>...</html>" --receivers '[...]'
 */

const { fetchWithRetry } = require('./lib/fetch-retry')
const { config } = require('./lib/client')

// Commands
const { run } = require('./commands/run')
const { chat } = require('./commands/chat')
const { tts } = require('./commands/tts')
const { stt } = require('./commands/stt')
const { image, upscale, img2img } = require('./commands/image')
const { video, multimodal } = require('./commands/video')
const { search, scrape, linkupSearch, linkupFetch } = require('./commands/search')
const { sendEmail, sendBatchEmails } = require('./commands/email')
const { smsVerify, smsCheck, smsSend } = require('./commands/sms')
const { gamma, document } = require('./commands/document')
const { listModels } = require('./commands/models')

// CLI argument parsing
function parseArgs(args) {
  const parsed = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      if (value && !value.startsWith('--')) {
        parsed[key] = value
        i++
      } else {
        parsed[key] = true
      }
    } else if (!parsed._command) {
      parsed._command = arg
    }
  }
  return parsed
}

// Main CLI handler
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args._command

  if (!command || args.help) {
    console.log(`
SkillBoss API Hub - Multi-Provider API Gateway

Commands:
  list-models  List available models from API Hub
  run          Generic endpoint access (any model)
  chat         Chat completions (bedrock, openai, anthropic, openrouter, vertex, minimax, huggingface)
  tts          Text-to-speech (elevenlabs, minimax, openai, mm/qwen3-tts-flash)
  stt          Speech-to-text (openai/whisper-1, huggingface/openai/whisper-large-v3)
  image        Image generation (vertex/gemini, replicate/flux, mm/img)
  upscale      Image upscaling (fal/upscale)
  img2img      Image-to-image transformation (fal/img2img)
  multimodal   Video/image/audio understanding (mm/qwen3-vl-plus, mm/qwen3-vl-max)
  search       Web search (scrapingdog, perplexity)
  linkup-search Structured web search (linkup: searchResults, sourcedAnswer, structured)
  linkup-fetch  URL-to-markdown fetcher (linkup)
  scrape       Web scraping (scrapingdog, firecrawl)
  video        Video generation (minimax, vertex/veo, mm/t2v, mm/i2v)
  document     Document processing (reducto: parse, extract, split, edit)
  gamma        Presentations (gamma)
  sms-verify   Send OTP verification code (prelude)
  sms-check    Check OTP verification code (prelude)
  sms-send     Send SMS notification (prelude)
  send-email   Send a single email (aws/ses)
  send-batch   Send batch emails with templates
  version      Check for updates and show current/latest version

Common Options:
  --model        Model in "vendor/model" format (required for most commands)
  --stream       Enable streaming output (chat only)
  --output       Save response to file (tts, image, video)
  --no-fallback  Disable automatic fallback on errors (fallback is enabled by default)

Examples:
  # Generic run
  node api-hub.js run --model "scrapingdog/google_search" --inputs '{"q":"test"}'

  # Chat
  node api-hub.js chat --model "bedrock/claude-4-sonnet" --prompt "Hello"
  node api-hub.js chat --model "openrouter/deepseek/deepseek-r1" --prompt "Hello" --stream
  node api-hub.js chat --model "huggingface/meta-llama/Llama-3-8B-Instruct" --prompt "Hello"

  # HuggingFace (any model from huggingface.co/models works)
  node api-hub.js chat --model "huggingface/zai-org/GLM-5" --prompt "Hello" --stream
  node api-hub.js run --model "huggingface/BAAI/bge-small-en-v1.5" --inputs '{"task":"embedding","input":"hello world"}'
  node api-hub.js run --model "huggingface/stabilityai/stable-diffusion-xl-base-1.0" --inputs '{"task":"image","prompt":"a sunset"}' --output /tmp/image.png

  # TTS
  node api-hub.js tts --model "elevenlabs/eleven_multilingual_v2" --text "Hello" --output /tmp/audio.mp3
  node api-hub.js tts --model "mm/qwen3-tts-flash" --text "Hello" --output /tmp/audio.wav

  # STT (Speech-to-Text)
  node api-hub.js stt --file recording.mp3
  node api-hub.js stt --file interview.wav --language en --output /tmp/transcript.txt

  # Multimodal (video/image understanding)
  node api-hub.js multimodal --model "mm/qwen3-vl-plus" --video "https://example.com/video.mp4" --prompt "What's happening in this video?"
  node api-hub.js multimodal --model "mm/qwen3-vl-max" --image "https://example.com/image.jpg" --prompt "Describe this image"

  # Image (default: mm/img)
  node api-hub.js image --prompt "A sunset" --output image.png
  node api-hub.js image --model "vertex/gemini-3-pro-image-preview" --prompt "A sunset"
  node api-hub.js image --prompt "A sunset" --size "1024*1536" --output image.png

  # Upscale (FAL)
  node api-hub.js upscale --image-url "https://example.com/photo.jpg" --output upscaled.png
  node api-hub.js upscale --image-url "https://example.com/photo.jpg" --scale 4 --output upscaled.png

  # Image-to-Image (FAL FLUX dev)
  node api-hub.js img2img --image-url "https://example.com/photo.jpg" --prompt "watercolor painting" --output result.jpg
  node api-hub.js img2img --image-url "https://example.com/photo.jpg" --prompt "oil painting" --strength 0.9 --output result.jpg

  # Video (default: mm/t2v for text-to-video, mm/i2v for image-to-video)
  node api-hub.js video --prompt "A cat walking" --duration 5 --output video.mp4
  node api-hub.js video --prompt "Animate this" --image "https://example.com/cat.jpg" --duration 5 --output video.mp4
  node api-hub.js video --model "vertex/veo-3.1-fast-generate-preview" --prompt "A sunset" --output video.mp4

  # Document Processing
  node api-hub.js document --model "reducto/parse" --url "https://example.com/doc.pdf"
  node api-hub.js document --model "reducto/extract" --url "https://example.com/doc.pdf" --schema '{"type":"object","properties":{"title":{"type":"string"}}}'

  # Search & Scrape
  node api-hub.js search --model "scrapingdog/google_search" --query "nodejs"
  node api-hub.js scrape --model "firecrawl/scrape" --url "https://example.com"

  # Linkup (structured search + URL fetch)
  node api-hub.js linkup-search --query "latest AI news"
  node api-hub.js linkup-search --query "population of Tokyo" --output-type structured --schema '{"type":"object","properties":{"city":{"type":"string"},"population":{"type":"number"}}}'
  node api-hub.js linkup-search --query "compare React vs Vue" --output-type sourcedAnswer --depth deep
  node api-hub.js linkup-fetch --url "https://example.com"
  node api-hub.js linkup-fetch --url "https://example.com" --render-js

  # SMS Verification
  node api-hub.js sms-verify --phone "+1234567890"
  node api-hub.js sms-check --phone "+1234567890" --code "123456"
  node api-hub.js sms-send --phone "+1234567890" --template-id "your_template_id"

  # Email
  node api-hub.js send-email --to "user@example.com" --subject "Hello" --body "<p>Hi!</p>"

  # List Models
  node api-hub.js list-models
  node api-hub.js list-models --type chat
  node api-hub.js list-models --vendor openai
`)
    process.exit(0)
  }

  try {
    let result

    switch (command) {
      case 'list-models': {
        result = await listModels({
          type: args.type,
          vendor: args.vendor,
        })

        // Group by category for display
        const grouped = {}
        for (const m of result.models) {
          const cat = m.category || 'Other'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(m)
        }

        console.log(`\nAvailable Models (${result.count} total)\n`)
        for (const [category, models] of Object.entries(grouped).sort()) {
          console.log(`## ${category}`)
          for (const m of models) {
            console.log(`  ${m.id}`)
            console.log(`    ${m.display_name || m.name} - ${m.description || ''}`)
          }
          console.log()
        }
        break
      }

      case 'run': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        const inputs = args.inputs ? JSON.parse(args.inputs) : {}
        result = await run({
          model: args.model,
          inputs,
          stream: args.stream,
          output: args.output,
          autoFallback: !args['no-fallback'],
        })

        if (args.stream) {
          // Handle streaming output
          for await (const chunk of result) {
            // Extract text content from various response formats
            const text =
              chunk.choices?.[0]?.delta?.content ||
              chunk.delta?.text ||
              chunk.content?.[0]?.text ||
              ''
            if (text) process.stdout.write(text)
          }
          console.log() // Final newline
        } else if (result.saved) {
          console.log(`Saved to: ${result.saved}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'chat': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        if (!args.prompt && !args.messages) {
          console.error('Error: --prompt or --messages is required')
          process.exit(1)
        }

        result = await chat({
          model: args.model,
          prompt: args.prompt,
          messages: args.messages ? JSON.parse(args.messages) : undefined,
          system: args.system,
          stream: args.stream,
          maxTokens: args['max-tokens']
            ? parseInt(args['max-tokens'])
            : undefined,
          temperature: args.temperature
            ? parseFloat(args.temperature)
            : undefined,
        })

        if (args.stream) {
          for await (const chunk of result) {
            const text =
              chunk.choices?.[0]?.delta?.content ||
              chunk.delta?.text ||
              chunk.content?.[0]?.text ||
              ''
            if (text) process.stdout.write(text)
          }
          console.log()
        } else {
          // Extract text from response
          const text =
            result.choices?.[0]?.message?.content ||
            result.content?.[0]?.text ||
            result.message?.content ||
            JSON.stringify(result, null, 2)
          console.log(text)
        }
        break
      }

      case 'tts': {
        if (!args.model || !args.text || !args.output) {
          console.error('Error: --model, --text, and --output are required')
          process.exit(1)
        }
        result = await tts({
          model: args.model,
          text: args.text,
          voiceId: args['voice-id'],
          output: args.output,
        })
        console.log(`Audio saved to: ${args.output}`)
        break
      }

      case 'stt': {
        if (!args.file) {
          console.error('Error: --file is required (local audio file path)')
          process.exit(1)
        }
        result = await stt({
          file: args.file,
          model: args.model,
          prompt: args.prompt,
          language: args.language,
          output: args.output,
        })
        console.log(result.text)
        if (result.saved) {
          console.log(`\nTranscript saved to: ${result.saved}`)
        }
        break
      }

      case 'image': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        const imageModel = args.model || 'mm/img'
        result = await image({
          model: imageModel,
          prompt: args.prompt,
          size: args.size,
          output: args.output,
        })
        if (args.output) {
          console.log(`Image saved to: ${args.output}`)
          if (result.url) {
            console.log(`URL: ${result.url}`)
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'upscale': {
        if (!args['image-url']) {
          console.error('Error: --image-url is required')
          process.exit(1)
        }
        result = await upscale({
          imageUrl: args['image-url'],
          scale: args.scale ? parseInt(args.scale) : undefined,
          outputFormat: args['output-format'],
          output: args.output,
        })
        if (args.output) {
          console.log(`Upscaled image saved to: ${args.output}`)
          if (result.url) console.log(`URL: ${result.url}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'img2img': {
        if (!args['image-url'] || !args.prompt) {
          console.error('Error: --image-url and --prompt are required')
          process.exit(1)
        }
        result = await img2img({
          imageUrl: args['image-url'],
          prompt: args.prompt,
          strength: args.strength ? parseFloat(args.strength) : undefined,
          imageSize: args['image-size'],
          outputFormat: args['output-format'],
          numImages: args['num-images'] ? parseInt(args['num-images']) : undefined,
          output: args.output,
        })
        if (args.output) {
          console.log(`Transformed image saved to: ${args.output}`)
          if (result.url) console.log(`URL: ${result.url}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'search': {
        if (!args.model || !args.query) {
          console.error('Error: --model and --query are required')
          process.exit(1)
        }
        result = await search({
          model: args.model,
          query: args.query,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'scrape': {
        if (!args.model || (!args.url && !args.urls)) {
          console.error('Error: --model and --url (or --urls) are required')
          process.exit(1)
        }
        result = await scrape({
          model: args.model,
          url: args.url,
          urls: args.urls ? JSON.parse(args.urls) : undefined,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'linkup-search': {
        if (!args.query) {
          console.error('Error: --query is required')
          process.exit(1)
        }
        result = await linkupSearch({
          query: args.query,
          outputType: args['output-type'],
          depth: args.depth,
          structuredOutputSchema: args.schema,
          includeDomains: args['include-domains'] ? JSON.parse(args['include-domains']) : undefined,
          excludeDomains: args['exclude-domains'] ? JSON.parse(args['exclude-domains']) : undefined,
          fromDate: args['from-date'],
          toDate: args['to-date'],
          maxResults: args['max-results'] ? parseInt(args['max-results']) : undefined,
          includeImages: args['include-images'] ? args['include-images'] === 'true' : undefined,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'linkup-fetch': {
        if (!args.url) {
          console.error('Error: --url is required')
          process.exit(1)
        }
        result = await linkupFetch({
          url: args.url,
          renderJs: args['render-js'] === true || args['render-js'] === 'true',
          includeImages: args['include-images'] === true || args['include-images'] === 'true',
          includeRawHtml: args['include-raw-html'] === true || args['include-raw-html'] === 'true',
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'video': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        // Default model: use mm/i2v if --image provided, otherwise mm/t2v
        const videoModel = args.model || (args.image ? 'mm/i2v' : 'mm/t2v')
        result = await video({
          model: videoModel,
          prompt: args.prompt,
          size: args.size,
          duration: args.duration,
          image: args.image,
          output: args.output,
        })
        if (args.output) {
          console.log(`Video saved to: ${args.output}`)
          if (result.url) {
            console.log(`URL: ${result.url}`)
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'multimodal': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        if (!args.video && !args.image && !args.audio) {
          console.error('Error: At least one of --video, --image, or --audio is required')
          process.exit(1)
        }
        result = await multimodal({
          model: args.model,
          prompt: args.prompt,
          video: args.video,
          image: args.image,
          audio: args.audio,
          fps: args.fps,
        })

        // Extract text from response
        const text =
          result.output?.choices?.[0]?.message?.content?.[0]?.text ||
          result.text ||
          JSON.stringify(result, null, 2)
        console.log(text)
        break
      }

      case 'gamma': {
        if (!args.model || !args['input-text']) {
          console.error('Error: --model and --input-text are required')
          process.exit(1)
        }
        result = await gamma({
          model: args.model,
          inputText: args['input-text'],
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'document': {
        if (!args.model || !args.url) {
          console.error('Error: --model and --url are required')
          process.exit(1)
        }
        result = await document({
          model: args.model,
          url: args.url,
          schema: args.schema,
          splitDescription: args['split-description'],
          instructions: args.instructions,
          settings: args.settings,
          output: args.output,
        })
        if (args.output) {
          console.log(`Saved to: ${args.output}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'sms-verify': {
        if (!args.phone) {
          console.error('Error: --phone is required (E.164 format, e.g. +1234567890)')
          process.exit(1)
        }
        result = await smsVerify({
          phone: args.phone,
          ip: args.ip,
          deviceId: args['device-id'],
        })
        console.log(`\nVerification sent to: ${args.phone}`)
        console.log(`Status: ${result.status}`)
        console.log(`Verification ID: ${result.id}`)
        if (result.channels) {
          console.log(`Channel: ${result.channels.join(', ')}`)
        }
        break
      }

      case 'sms-check': {
        if (!args.phone || !args.code) {
          console.error('Error: --phone and --code are required')
          process.exit(1)
        }
        result = await smsCheck({
          phone: args.phone,
          code: args.code,
        })
        console.log(`\nVerification check for: ${args.phone}`)
        console.log(`Status: ${result.status}`)
        if (result.status === 'success') {
          console.log('Phone number verified successfully!')
        } else {
          console.log('Verification failed. Code may be incorrect or expired.')
        }
        break
      }

      case 'sms-send': {
        if (!args.phone || !args['template-id']) {
          console.error('Error: --phone and --template-id are required')
          process.exit(1)
        }
        result = await smsSend({
          phone: args.phone,
          templateId: args['template-id'],
          variables: args.variables ? JSON.parse(args.variables) : undefined,
          from: args.from,
        })
        console.log(`\nSMS sent to: ${args.phone}`)
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'send-email': {
        // Support both --to (new) and --receivers (legacy)
        const toArg = args.to || args.receivers
        if (!toArg || !args.subject || !args.body) {
          console.error(
            'Error: --to, --subject, and --body are required for send-email',
          )
          process.exit(1)
        }

        const receivers = toArg.split(',').map((e) => e.trim())
        result = await sendEmail({
          subject: args.subject,
          bodyHtml: args.body,
          receivers,
          replyTo: args['reply-to']?.split(',').map((e) => e.trim()),
          projectId: args['project-id'],
        })

        console.log('\nEmail sent successfully!')
        console.log(`To: ${receivers.join(', ')}`)
        console.log(`Subject: ${args.subject}`)
        break
      }

      case 'send-batch': {
        if (!args.receivers || !args.subject || !args.body) {
          console.error(
            'Error: --receivers, --subject, and --body are required for send-batch',
          )
          process.exit(1)
        }

        const receivers = JSON.parse(args.receivers)
        result = await sendBatchEmails({
          subject: args.subject,
          bodyHtml: args.body,
          receivers,
          replyTo: args['reply-to']?.split(',').map((e) => e.trim()),
          projectId: args['project-id'],
        })

        console.log('\nBatch emails sent!')
        console.log(`Recipients: ${receivers.length}`)
        break
      }

      case 'version': {
        const localVersion = config.version || 'unknown'
        console.log(`Current version: ${localVersion}`)

        try {
          const res = await fetchWithRetry('https://www.skillboss.co/api/skills/version')
          if (!res.ok) {
            console.log('\nCould not check latest version (server error)')
            break
          }
          const data = await res.json()
          console.log(`Latest version: ${data.version}`)

          if (localVersion !== data.version && localVersion !== 'unknown') {
            console.log('\n*** Update available! ***')
            if (data.changelog) {
              console.log(`\nChangelog:\n${data.changelog}`)
            }
            console.log('\nTo update, run: bash ./skillboss/install/update.sh')
          } else if (localVersion === 'unknown') {
            console.log('\nLocal version unknown. Consider updating to ensure you have the latest features.')
            console.log('To update, run: bash ./skillboss/install/update.sh')
          } else {
            console.log('\nYou are on the latest version.')
          }
        } catch (e) {
          console.log('\nCould not check latest version (network error)')
        }
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        console.error('Run with --help to see available commands')
        process.exit(1)
    }

    if (process.env.DEBUG && result) {
      console.log('\nDebug Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('\nError:', error.message)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (process.argv[1]?.endsWith('api-hub.js')) {
  main()
}

// Export for module usage
module.exports = {
  // High-level commands
  run,
  chat,
  tts,
  stt,
  image,
  upscale,
  img2img,
  multimodal,
  search,
  scrape,
  video,
  document,
  gamma,
  listModels,

  // Linkup
  linkupSearch,
  linkupFetch,

  // SMS/Verify
  smsVerify,
  smsCheck,
  smsSend,

  // Email
  sendEmail,
  sendBatchEmails,
}
