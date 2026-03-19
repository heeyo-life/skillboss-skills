'use strict'

const fs = require('node:fs')
const path = require('node:path')

const SKILL_MD_TEMPLATE = `---
name: {{NAME}}
description: {{DESCRIPTION}}
tools:
  - Bash
  - Read
  - Write
  - WebFetch
tags:
  - utility
runtime:
  timeout: 120
  max_turns: 20
---

You are a helpful assistant. When given a task:

1. Understand the user's request
2. Execute the necessary steps using the available tools
3. Return a clear, concise result

Be accurate and efficient.
`

async function create(args) {
  const name = args[0]
  if (!name) {
    console.error('Usage: skillboss create <name>')
    console.error('Example: skillboss create url-summarizer')
    process.exit(1)
  }

  // Sanitize name for directory
  const dirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const skillDir = path.join(process.cwd(), dirName)

  if (fs.existsSync(skillDir)) {
    console.error(`Directory "${dirName}" already exists.`)
    process.exit(1)
  }

  fs.mkdirSync(skillDir, { recursive: true })

  // Create SKILL.md from template
  const displayName = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  const skillMd = SKILL_MD_TEMPLATE.replace('{{NAME}}', displayName).replace(
    '{{DESCRIPTION}}',
    `A skill that ${displayName.toLowerCase()}`,
  )

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8')

  console.log(`Created skill directory: ${dirName}/`)
  console.log(`  ${dirName}/SKILL.md`)
  console.log('')
  console.log('Next steps:')
  console.log(`  1. Edit ${dirName}/SKILL.md to define your skill`)
  console.log(
    `  2. skillboss test ${dirName} --input "your test input"`,
  )
  console.log(`  3. skillboss publish ${dirName}`)
}

module.exports = create
