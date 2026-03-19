'use strict'

const fs = require('node:fs')
const path = require('node:path')

function readSkillMd(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(
      `SKILL.md not found in ${skillDir}. Run "skillboss create <name>" first.`,
    )
  }
  return fs.readFileSync(skillMdPath, 'utf-8')
}

function parseSkillName(skillMd) {
  const match = skillMd.match(/^name:\s*(.+)$/m)
  return match ? match[1].trim() : 'Untitled Skill'
}

function resolveSkillDir(nameOrPath) {
  // If it's an absolute or relative path that exists
  if (fs.existsSync(nameOrPath)) {
    const stat = fs.statSync(nameOrPath)
    if (stat.isDirectory()) return nameOrPath
    return path.dirname(nameOrPath)
  }

  // Try as subdirectory of current working directory
  const cwd = process.cwd()
  const subdir = path.join(cwd, nameOrPath)
  if (fs.existsSync(subdir) && fs.statSync(subdir).isDirectory()) {
    return subdir
  }

  // Try current directory (if SKILL.md exists here)
  if (fs.existsSync(path.join(cwd, 'SKILL.md'))) {
    return cwd
  }

  throw new Error(
    `Could not find skill directory for "${nameOrPath}". ` +
      'Provide a directory path or run from the skill directory.',
  )
}

module.exports = { readSkillMd, parseSkillName, resolveSkillDir }
