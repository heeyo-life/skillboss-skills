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
 * - Chat: node api-hub.js chat --model "huggingface/meta-llama/Llama-3.1-8B-Instruct" --prompt "Hello"
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
const { config, apiHubGet, apiHubPost, ensureApiKey, detectAgentType } = require('./lib/client')

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
const { music } = require('./commands/music')
const { pilot, getPilotPreference, setPilotPreference } = require('./commands/pilot')
const { listModels } = require('./commands/models')
const { skillsSearch, skillsDetail, skillsRun } = require('./commands/skills')
const { stitchGenerate, stitchEdit, stitchVariants, stitchGetHtml } = require('./commands/stitch')

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
  pilot        Smart model selector --auto-picks the best model for your task (RECOMMENDED)

  run          Run a specific model by ID
  chat         Chat completions
  image        Image generation
  upscale      Image upscaling
  img2img      Image-to-image transformation
  video        Video generation
  music        Music generation
  tts          Text-to-speech
  stt          Speech-to-text
  multimodal   Video/image/audio understanding
  search       Web search
  linkup-search Structured web search
  linkup-fetch  URL-to-markdown fetcher
  scrape       Web scraping
  document     Document processing
  gamma        Presentations
  sms-verify   Send OTP verification code
  sms-check    Check OTP verification code
  sms-send     Send SMS notification
  send-email   Send a single email
  send-batch   Send batch emails with templates
  skills       Discover & run community skills
  stitch-generate  Generate UI from text prompt (Google Stitch)
  stitch-edit      Edit an existing Stitch screen
  stitch-variants  Generate multiple UI variants of a screen
  stitch-html      Get full HTML source of a Stitch screen

  version      Check for updates
  list-models  List available models from API Hub

Common Options:
  --model        Model in "vendor/model" format (required for most commands)
  --stream       Enable streaming output (chat only)
  --output       Save response to file (tts, image, video)
  --no-fallback  Disable automatic fallback on errors (fallback is enabled by default)

Pilot Examples (recommended --auto-selects best model for your task):
  node api-hub.js pilot                                                          # See all capabilities
  node api-hub.js pilot --discover                                               # Browse available model types
  node api-hub.js pilot --discover --keyword "CEO"                               # Search models by keyword
  node api-hub.js pilot --type image --prefer price --limit 3                    # Get model recommendations
  node api-hub.js pilot --type image --prompt "A sunset" --output sunset.png     # Generate image (auto-select)
  node api-hub.js pilot --type chat --prompt "Explain quantum computing"         # Chat (auto-select)
  node api-hub.js pilot --type tts --text "Hello world" --output hello.mp3       # Text-to-speech (auto-select)
  node api-hub.js pilot --type stt --file recording.m4a                          # Speech-to-text (auto-select)
  node api-hub.js pilot --type music --prompt "upbeat" --duration 30 --output track.mp3  # Music (auto-select)
  node api-hub.js pilot --type video --prompt "A cat playing" --output video.mp4         # Video (auto-select)
  node api-hub.js pilot --type ui --prompt "A SaaS dashboard with sidebar"               # UI generation (auto-select)
  node api-hub.js pilot --set-prefer price                                         # Set preference to prioritize cost
  node api-hub.js pilot --set-prefer quality                                       # Set preference to prioritize quality
  node api-hub.js pilot --set-prefer off                                           # Clear preference (use default balanced)
  node api-hub.js pilot --get-prefer                                               # View current preference

Direct Model Calls (when you already have a model ID):
  node api-hub.js chat --model MODEL_ID --prompt "Hello"
  node api-hub.js image --prompt "A sunset" --output image.png
  node api-hub.js run --model MODEL_ID --inputs '{"key":"value"}'
  node api-hub.js list-models --type chat
`)
    process.exit(0)
  }

  try {
    let result

    switch (command) {
      case 'pilot': {
        // Handle preference management flags
        if (args['set-prefer']) {
          const prefResult = await setPilotPreference(args['set-prefer'])
          if (prefResult.prefer === null) {
            console.log('Pilot preference cleared (using default: balanced)')
          } else {
            console.log(`Pilot preference set to: ${prefResult.prefer}`)
          }
          break
        }
        if (args['get-prefer']) {
          const prefResult = await getPilotPreference()
          if (prefResult.prefer) {
            console.log(`Current pilot preference: ${prefResult.prefer}`)
          } else {
            console.log('No pilot preference set (using default: balanced)')
          }
          break
        }

        result = await pilot(args)

        switch (result.mode) {
          case 'guide':
            console.log(JSON.stringify(result.data, null, 2))
            break

          case 'discover': {
            const d = result.data
            if (d.types) {
              console.log('\nAvailable types:')
              for (const t of d.types) {
                console.log(`  ${t}`)
              }
            }
            if (d.matches) {
              console.log('\nMatches:')
              for (const m of d.matches) {
                console.log(`  ${m.id || m.model} --${m.display_name || m.name || ''}`)
              }
            }
            if (!d.types && !d.matches) {
              console.log(JSON.stringify(d, null, 2))
            }
            break
          }

          case 'recommend': {
            const r = result.data
            if (r.models) {
              console.log(`\nRecommended models for type "${args.type}":`)
              for (const m of r.models) {
                const score = m.score ? ` (score: ${m.score})` : ''
                const modelId = m.recommended_vendor || m.id || m.base_model || m.model
                console.log(`  ${modelId}${score}`)
                if (m.display_name) console.log(`    ${m.display_name}`)
              }
            } else {
              console.log(JSON.stringify(r, null, 2))
            }
            break
          }

          case 'execute': {
            if (result.saved) {
              console.log(`Saved to: ${result.saved}`)
            } else {
              const d = result.data
              // Pilot API nests vendor result inside d.result
              const inner = d.result || d
              // Try to extract text content
              const text =
                inner.choices?.[0]?.message?.content ||
                inner.content?.[0]?.text ||
                inner.text ||
                inner.message?.content ||
                d.choices?.[0]?.message?.content
              if (text) {
                console.log(text)
              } else {
                console.log(JSON.stringify(d, null, 2))
              }
            }
            break
          }

          case 'chain': {
            const c = result.data
            if (c.steps) {
              console.log('\nWorkflow steps:')
              for (let i = 0; i < c.steps.length; i++) {
                const step = c.steps[i]
                console.log(`  Step ${i + 1}: ${step.type} ->${step.model || step.id || '(auto)'}`)
                if (step.pipe_hint) console.log(`    Pipe: ${step.pipe_hint}`)
              }
            } else {
              console.log(JSON.stringify(c, null, 2))
            }
            break
          }

          default:
            console.log(JSON.stringify(result.data, null, 2))
        }
        break
      }

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

      case 'music': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        const musicModel = args.model || 'replicate/elevenlabs/music'
        result = await music({
          model: musicModel,
          prompt: args.prompt,
          duration: args.duration,
          output: args.output,
        })
        if (args.output) {
          console.log(`Music saved to: ${args.output}`)
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

      case 'stitch-generate': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        result = await stitchGenerate({
          prompt: args.prompt,
          model: args.model,
          deviceType: args['device-type'],
          output: args.output,
        })
        if (!args.output) {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'stitch-edit': {
        if (!args['screen-id'] || !args['project-id'] || !args.prompt) {
          console.error('Error: --screen-id, --project-id, and --prompt are required')
          process.exit(1)
        }
        result = await stitchEdit({
          screenId: args['screen-id'],
          projectId: args['project-id'],
          prompt: args.prompt,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'stitch-variants': {
        if (!args['screen-id'] || !args['project-id']) {
          console.error('Error: --screen-id and --project-id are required')
          process.exit(1)
        }
        result = await stitchVariants({
          screenId: args['screen-id'],
          projectId: args['project-id'],
          count: args.count,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'stitch-html': {
        if (!args['screen-id'] || !args['project-id']) {
          console.error('Error: --screen-id and --project-id are required')
          process.exit(1)
        }
        result = await stitchGetHtml({
          screenId: args['screen-id'],
          projectId: args['project-id'],
          output: args.output,
        })
        if (!args.output) {
          console.log(JSON.stringify(result, null, 2))
        }
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
            console.log('\nTo update, run: bash ./install/update.sh')
          } else if (localVersion === 'unknown') {
            console.log('\nLocal version unknown. Consider updating to ensure you have the latest features.')
            console.log('To update, run: bash ./install/update.sh')
          } else {
            console.log('\nYou are on the latest version.')
          }
        } catch (e) {
          console.log('\nCould not check latest version (network error)')
        }
        break
      }

      case 'skills': {
        if (args['search']) {
          const q = encodeURIComponent(args['search'])
          const searchResult = await apiHubGet(`/skills/search?q=${q}&format=markdown`)
          console.log(typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult, null, 2))
        } else if (args['category']) {
          const searchResult = await apiHubGet(`/skills/search?category=${encodeURIComponent(args['category'])}&format=markdown`)
          console.log(typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult, null, 2))
        } else if (args['info']) {
          const slug = encodeURIComponent(args['info'])
          const searchResult = await apiHubGet(`/skills/${slug}?format=markdown`)
          console.log(typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult, null, 2))
        } else if (args['run']) {
          const skillName = args['run']
          const input = args['input'] || ''
          const stream = args['stream'] !== undefined
          await runSkill(skillName, input, stream)
        } else {
          console.error('Usage: node scripts/api-hub.js skills --search <query>')
          console.error('       node scripts/api-hub.js skills --info @user/skill')
          console.error('       node scripts/api-hub.js skills --run @user/skill --input <text>')
          process.exit(1)
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

    // Auto-update check after successful command execution (skip for version command itself)
    if (command !== 'version') {
      await checkForUpdates()
    }
  } catch (error) {
    console.error('\nError:', error.message)
    process.exit(1)
  }
}

/**
 * Run a community skill via /v1/run with model="skill"
 * @param {string} skillName - Skill slug (e.g. @alice/url-summarizer)
 * @param {string} input - Text input to the skill
 * @param {boolean} stream - Whether to stream the response via SSE
 */
async function runSkill(skillName, input, stream) {
  const body = {
    model: 'skill',
    inputs: {
      name: skillName,
      parts: [{ type: 'text', text: input }],
      stream: stream,
    },
  }

  if (stream) {
    // SSE streaming
    const apiKey = await ensureApiKey()
    const baseUrl = config.baseUrl || 'https://api.heybossai.com/v1'
    const res = await fetchWithRetry(`${baseUrl}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Agent-Type': detectAgentType(),
        'X-Skill-Pack': config.leadSkill || 'skillboss',
      },
      body: JSON.stringify(body),
    })
    for await (const chunk of res.body) {
      const text = new TextDecoder().decode(chunk)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') break
        try {
          const ev = JSON.parse(data)
          if (ev.type === 'text-delta') process.stdout.write(ev.delta)
          else if (ev.type === 'file') console.log(`\n[File] ${ev.url}`)
          else if (ev.type === 'progress') process.stderr.write(`[${ev.status}] ${ev.message}\n`)
        } catch {}
      }
    }
  } else {
    const result = await apiHubPost('/run', body)
    console.log(JSON.stringify(result, null, 2))
  }
}

/**
 * Check for updates and AUTO-UPDATE if new version available
 * No user intervention required - Agent will always have latest version
 */
async function checkForUpdates() {
  const { execSync } = require('child_process')
  const path = require('path')
  const fs = require('fs')

  try {
    const localVersion = config.version
    if (!localVersion || localVersion === 'unknown') return

    const res = await fetchWithRetry('https://www.skillboss.co/api/skills/version', {
      timeout: 3000,
    })
    if (!res.ok) return

    const data = await res.json()
    if (data.version && data.version !== localVersion) {
      console.log(`\n[skillboss] Auto-updating: ${localVersion} ->${data.version}`)

      // Find the skillboss directory (parent of scripts/)
      const scriptDir = __dirname
      const skillbossDir = path.dirname(scriptDir)
      const updateScript = path.join(skillbossDir, 'install', 'update.sh')

      if (fs.existsSync(updateScript)) {
        try {
          // Run update script silently
          execSync(`bash "${updateScript}"`, {
            stdio: 'pipe',
            timeout: 60000 // 60 second timeout
          })
          console.log(`[skillboss] Updated successfully to ${data.version}`)
        } catch (updateError) {
          // Update failed, just notify - don't block the workflow
          console.log(`[skillboss] Auto-update failed. Run manually: bash ./install/update.sh`)
        }
      }
    }
  } catch (e) {
    // Silently ignore update check errors
  }
}

// Run CLI if executed directly
if (process.argv[1]?.endsWith('api-hub.js')) {
  main()
}

// Export for module usage
module.exports = {
  // Smart model selector
  pilot,

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
  music,
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

  // Skills marketplace
  runSkill,
  skillsSearch,
  skillsDetail,
  skillsRun,
}
