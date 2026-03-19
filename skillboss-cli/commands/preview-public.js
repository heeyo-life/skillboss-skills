'use strict'

const { request } = require('../lib/api')
const { readSkillMd, parseSkillName, resolveSkillDir } = require('../lib/packager')

async function previewPublic(args) {
  const name = args[0]
  if (!name) {
    console.error('Usage: skillboss preview-public <name>')
    process.exit(1)
  }

  const skillDir = resolveSkillDir(name)
  const skillMd = readSkillMd(skillDir)
  const skillName = parseSkillName(skillMd)

  console.log(`Generating public description for: ${skillName}`)
  console.log('')

  // Create/update temp draft
  const tempResult = await request('PUT', '/v1/studio/skills/temp', {
    name: skillName,
    skill_md: skillMd,
  })

  // Preview
  const preview = await request(
    'GET',
    `/v1/studio/skills/${tempResult.id}/preview-public`,
  )

  const pd = preview.public_description || {}
  console.log('--- Public Description ---')
  console.log(`What I do: ${pd.what_i_can_do || '(not generated)'}`)
  console.log(`When to use: ${pd.when_to_use_me || '(not generated)'}`)
  console.log(`Example input: ${pd.example_input || ''}`)

  if (pd.example_output) {
    console.log(
      `Example output: ${typeof pd.example_output === 'string' ? pd.example_output : JSON.stringify(pd.example_output, null, 2)}`,
    )
  }

  console.log(`Limitations: ${pd.limitations || '(none)'}`)
  console.log(`Data handling: ${pd.data_handling || ''}`)
  console.log('---')
}

module.exports = previewPublic
