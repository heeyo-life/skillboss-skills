'use strict'

const { request } = require('../lib/api')

async function list(_args) {
  const data = await request('GET', '/v1/studio/skills')
  const skills = data.skills || []

  if (skills.length === 0) {
    console.log('No skills found. Run "skillboss create <name>" to get started.')
    return
  }

  console.log(`Your skills (${skills.length}):\n`)

  for (const skill of skills) {
    const status = skill.status === 'active' ? '\u2705' : '\u270F\uFE0F '
    const price =
      skill.price > 0 ? `$${skill.price}/call` : 'free'
    console.log(`  ${status} ${skill.slug || skill.name}`)
    console.log(`     ${skill.description || '(no description)'}`)
    console.log(
      `     Status: ${skill.status} | Version: ${skill.version || '0.1.0'} | Price: ${price}`,
    )
    console.log('')
  }
}

module.exports = list
