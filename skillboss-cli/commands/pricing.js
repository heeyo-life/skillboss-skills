'use strict'

const { request } = require('../lib/api')

async function pricing(args) {
  let slug = ''
  let newPrice = null
  let i = 0

  if (args[0] && !args[0].startsWith('--')) {
    slug = args[0]
    i = 1
  }

  while (i < args.length) {
    if (args[i] === '--set' && args[i + 1]) {
      newPrice = parseFloat(args[i + 1])
      i += 2
    } else {
      i++
    }
  }

  if (!slug) {
    console.error('Usage: skillboss pricing <slug> [--set <price>]')
    console.error('Example: skillboss pricing @alice/my-skill --set 0.008')
    process.exit(1)
  }

  // Find skill
  const data = await request('GET', '/v1/studio/skills')
  const skills = data.skills || []
  const skill = skills.find((s) => s.slug === slug)

  if (!skill) {
    console.error(`Skill "${slug}" not found in your skills.`)
    process.exit(1)
  }

  if (newPrice === null) {
    // Show current pricing
    console.log(`${slug}: $${skill.price || 0}/call`)
    return
  }

  if (newPrice < 0 || isNaN(newPrice)) {
    console.error('Price must be a non-negative number.')
    process.exit(1)
  }

  await request('PUT', `/v1/studio/skills/${skill.id}`, {
    price: newPrice,
  })
  console.log(`Updated pricing: ${slug} → $${newPrice}/call`)
}

module.exports = pricing
