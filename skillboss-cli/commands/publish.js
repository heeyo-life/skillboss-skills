'use strict'

const readline = require('node:readline')
const { request } = require('../lib/api')
const { readSkillMd, parseSkillName, resolveSkillDir } = require('../lib/packager')

function parseArgs(args) {
  const result = { name: '', price: '0', visibility: 'public' }
  let i = 0

  if (args[0] && !args[0].startsWith('--')) {
    result.name = args[0]
    i = 1
  }

  while (i < args.length) {
    if (args[i] === '--price' && args[i + 1]) {
      result.price = args[i + 1]
      i += 2
    } else if (args[i] === '--visibility' && args[i + 1]) {
      result.visibility = args[i + 1]
      i += 2
    } else {
      i++
    }
  }

  return result
}

async function publish(args) {
  const parsed = parseArgs(args)

  if (!parsed.name) {
    console.error('Usage: skillboss publish <name> [--price <price>] [--visibility <public|unlisted|private>]')
    process.exit(1)
  }

  const skillDir = resolveSkillDir(parsed.name)
  const skillMd = readSkillMd(skillDir)
  const skillName = parseSkillName(skillMd)
  const price = parseFloat(parsed.price) || 0

  console.log(`Publishing: ${skillName}`)
  console.log(`  Visibility: ${parsed.visibility}`)
  console.log(`  Price: $${price}/call`)
  console.log('')

  // Create/update draft
  const tempResult = await request('PUT', '/v1/studio/skills/temp', {
    name: skillName,
    skill_md: skillMd,
  })

  const skillId = tempResult.id

  // Preview public description
  console.log('Generating public description...')
  const preview = await request(
    'GET',
    `/v1/studio/skills/${skillId}/preview-public`,
  )

  const pd = preview.public_description || {}
  console.log('')
  console.log('--- Public Description Preview ---')
  console.log(`What I do: ${pd.what_i_can_do || '(not generated)'}`)
  console.log(`When to use: ${pd.when_to_use_me || '(not generated)'}`)
  console.log(`Limitations: ${pd.limitations || '(not generated)'}`)
  console.log(`Data handling: ${pd.data_handling || ''}`)
  console.log('---')
  console.log('')

  // Confirm
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await new Promise((resolve) =>
    rl.question('Publish? (y/n) ', resolve),
  )
  rl.close()

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Cancelled.')
    process.exit(0)
  }

  // Publish
  const result = await request('POST', `/v1/studio/skills/${skillId}/publish`, {
    visibility: parsed.visibility,
    price,
    tags: [],
  })

  console.log('')
  console.log(`Published: ${result.slug}`)
  console.log(`Version: ${result.version}`)
  console.log(`Status: ${result.status}`)
}

module.exports = publish
