'use strict'

const { request, streamRequest } = require('../lib/api')
const { readSkillMd, parseSkillName, resolveSkillDir } = require('../lib/packager')

function parseArgs(args) {
  const result = { name: '', input: '' }
  let i = 0

  if (args[0] && !args[0].startsWith('--')) {
    result.name = args[0]
    i = 1
  }

  while (i < args.length) {
    if (args[i] === '--input' && args[i + 1]) {
      result.input = args[i + 1]
      i += 2
    } else {
      i++
    }
  }

  return result
}

async function test(args) {
  const parsed = parseArgs(args)

  if (!parsed.name) {
    console.error('Usage: skillboss test <name> --input <text>')
    process.exit(1)
  }

  if (!parsed.input) {
    console.error('Missing --input flag. Usage: skillboss test <name> --input "your input"')
    process.exit(1)
  }

  // Resolve skill directory and read SKILL.md
  const skillDir = resolveSkillDir(parsed.name)
  const skillMd = readSkillMd(skillDir)
  const skillName = parseSkillName(skillMd)

  console.log(`Testing: ${skillName}`)
  console.log('')

  // Create/update temp draft on api-hub
  const tempResult = await request('PUT', '/v1/studio/skills/temp', {
    name: skillName,
    skill_md: skillMd,
  })

  const skillId = tempResult.id

  // Start test run (SSE stream)
  const startTime = Date.now()
  const res = await streamRequest('POST', `/v1/studio/skills/${skillId}/test`, {
    input: parsed.input,
  })

  return new Promise((resolve) => {
    let buffer = ''

    res.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)
          if (event.type === 'text-delta') {
            process.stdout.write(event.delta || '')
          } else if (event.type === 'progress') {
            console.log(`\u25CF ${event.message}`)
          } else if (event.type === 'error') {
            console.error(`\n\u274C Error: ${event.message}`)
          } else if (event.type === 'file') {
            console.log(`\n\uD83D\uDCCE File: ${event.name} \u2192 ${event.url}`)
          } else if (event.type === 'finish') {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`\n\nTime: ${elapsed}s`)
          }
        } catch {
          // Skip malformed SSE events
        }
      }
    })

    res.on('end', () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`\nTotal time: ${elapsed}s`)
      resolve()
    })

    res.on('error', (err) => {
      console.error(`\nStream error: ${err.message}`)
      resolve()
    })
  })
}

module.exports = test
