#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { execSync } = require('child_process')
const os = require('os')

// ── Constants ────────────────────────────────────────────────────────
const API_BASE = process.env.SKILLBOSS_API_BASE || 'https://api.heybossai.com/v1'
const WEB_BASE = process.env.SKILLBOSS_WEB_BASE || 'https://www.skillboss.co'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

// Credential locations
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'skillboss')
const GLOBAL_CREDS_PATH = path.join(GLOBAL_CONFIG_DIR, 'credentials.json')
const LOCAL_CONFIG_PATH = path.join(__dirname, '..', 'config.json')

// ── Terminal helpers ─────────────────────────────────────────────────
const hasColor = process.stderr.isTTY && !process.env.NO_COLOR
const isTTY = process.stderr.isTTY

const c = {
  green:  s => hasColor ? `\x1b[32m${s}\x1b[0m` : s,
  red:    s => hasColor ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: s => hasColor ? `\x1b[33m${s}\x1b[0m` : s,
  cyan:   s => hasColor ? `\x1b[36m${s}\x1b[0m` : s,
  bold:   s => hasColor ? `\x1b[1m${s}\x1b[0m` : s,
  dim:    s => hasColor ? `\x1b[2m${s}\x1b[0m` : s,
}

function log(msg = '') { process.stderr.write(msg + '\n') }

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function spinner(message) {
  if (!isTTY) {
    log(`  - ${message}`)
    return {
      update(msg) { log(`  - ${msg}`) },
      stop(final) { log(`  ${ok()} ${final}`) },
      fail(final) { log(`  ${fail()} ${final}`) },
    }
  }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const id = setInterval(() => {
    process.stderr.write(`\r  ${c.yellow(frames[i++ % frames.length])} ${message}`)
  }, 80)
  return {
    update(msg) { message = msg },
    stop(final) {
      clearInterval(id)
      process.stderr.write(`\r  ${ok()} ${final}${' '.repeat(40)}\n`)
    },
    fail(final) {
      clearInterval(id)
      process.stderr.write(`\r  ${fail()} ${final}${' '.repeat(40)}\n`)
    },
  }
}

function ok()   { return c.green('✓') }
function fail() { return c.red('✗') }
function warn() { return c.yellow('!') }

// ── Credential storage ───────────────────────────────────────────────

function loadGlobalCreds() {
  try { return JSON.parse(fs.readFileSync(GLOBAL_CREDS_PATH, 'utf8')) }
  catch { return null }
}

function saveGlobalCreds(creds) {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  fs.writeFileSync(GLOBAL_CREDS_PATH, JSON.stringify(creds, null, 2) + '\n')
  try { fs.chmodSync(GLOBAL_CREDS_PATH, 0o600) } catch {}
}

function removeGlobalCreds() {
  try { fs.unlinkSync(GLOBAL_CREDS_PATH) } catch {}
}

function loadLocalConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8')) }
  catch { return null }
}

function saveLocalConfig(config) {
  fs.writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

function isPlaceholder(key) {
  if (!key || key === 'YOUR_API_KEY_HERE') return true
  if (/\s/.test(key) || key.includes('...')) return true
  return false
}

/**
 * Resolve the current API key.
 * Priority: env var > global creds > local config.json
 */
function resolveKey() {
  const envKey = process.env.SKILLBOSS_API_KEY
  if (envKey && !isPlaceholder(envKey)) {
    return { key: envKey, source: 'SKILLBOSS_API_KEY env var' }
  }

  const creds = loadGlobalCreds()
  if (creds?.api_key && !isPlaceholder(creds.api_key)) {
    return { key: creds.api_key, source: '~/.config/skillboss/credentials.json', type: creds.type }
  }

  const config = loadLocalConfig()
  if (config?.apiKey && !isPlaceholder(config.apiKey)) {
    return { key: config.apiKey, source: 'config.json' }
  }

  return null
}

function maskKey(key) {
  if (!key || key.length < 14) return key
  return key.slice(0, 10) + '...' + key.slice(-4)
}

/**
 * Persist key to all credential stores.
 */
function persistKey(apiKey, type = 'trial') {
  saveGlobalCreds({
    api_key: apiKey,
    type,
    updated_at: new Date().toISOString(),
  })
  log(`  ${ok()} Saved to ${c.dim('~/.config/skillboss/credentials.json')}`)

  const config = loadLocalConfig()
  if (config) {
    config.apiKey = apiKey
    saveLocalConfig(config)
    log(`  ${ok()} Updated ${c.dim('config.json')}`)
  }

  const profile = exportToShellProfile(apiKey)
  if (profile) {
    log(`  ${ok()} Exported SKILLBOSS_API_KEY to ${c.dim(path.basename(profile))}`)
  }

  process.env.SKILLBOSS_API_KEY = apiKey
}

// ── Shell helpers ─────────────────────────────────────────────────────

function getShellProfile() {
  const shell = process.env.SHELL || ''
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc')
  if (shell.includes('bash')) {
    const bp = path.join(os.homedir(), '.bash_profile')
    if (fs.existsSync(bp)) return bp
    return path.join(os.homedir(), '.bashrc')
  }
  return null
}

function exportToShellProfile(key) {
  const profile = getShellProfile()
  if (!profile) return false

  try {
    const content = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : ''
    const line = `export SKILLBOSS_API_KEY="${key}"`

    if (content.includes('SKILLBOSS_API_KEY=')) {
      fs.writeFileSync(profile, content.replace(/export SKILLBOSS_API_KEY="[^"]*"/, line))
    } else {
      fs.appendFileSync(profile, `\n# SkillBoss API key\n${line}\n`)
    }
    return profile
  } catch { return false }
}

function removeFromShellProfile() {
  const profile = getShellProfile()
  if (!profile || !fs.existsSync(profile)) return false

  try {
    let content = fs.readFileSync(profile, 'utf8')
    if (!content.includes('SKILLBOSS_API_KEY=')) return false
    content = content.replace(/\n?# SkillBoss API key\nexport SKILLBOSS_API_KEY="[^"]*"\n?/, '\n')
    content = content.replace(/export SKILLBOSS_API_KEY="[^"]*"\n?/, '')
    fs.writeFileSync(profile, content)
    return profile
  } catch { return false }
}

function openBrowser(url) {
  try {
    if (process.platform === 'darwin')      execSync(`open "${url}"`, { stdio: 'ignore' })
    else if (process.platform === 'win32')  execSync(`start "" "${url}"`, { stdio: 'ignore' })
    else                                    execSync(`xdg-open "${url}"`, { stdio: 'ignore' })
    return true
  } catch { return false }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── API ───────────────────────────────────────────────────────────────

async function provisionTempToken() {
  const resp = await fetch(`${API_BASE}/temp-token/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Provisioning failed (${resp.status}): ${body}`)
  }
  return resp.json()
}

async function pollBind(tempApiKey) {
  const resp = await fetch(`${API_BASE}/temp-token/poll-bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_api_key: tempApiKey }),
  })
  if (!resp.ok) throw new Error(`Poll failed (${resp.status})`)
  return resp.json()
}

// ── Help text ─────────────────────────────────────────────────────────

function helpMain() {
  log('')
  log(`  ${c.bold('skillboss')} - CLI for the SkillBoss AI platform`)
  log('')
  log('  USAGE')
  log(`    skillboss ${c.dim('<command>')} ${c.dim('[subcommand]')} ${c.dim('[flags]')}`)
  log('')
  log('  COMMANDS')
  log(`    auth          Manage authentication with SkillBoss`)
  log('')
  log(`  Run ${c.cyan('skillboss <command> --help')} for more information about a command.`)
  log('')
}

function helpAuth() {
  log('')
  log(`  ${c.bold('skillboss auth')} - Manage authentication with SkillBoss`)
  log('')
  log('  COMMANDS')
  log(`    login         Sign in to a SkillBoss account ${c.dim('(opens browser)')}`)
  log(`    trial         Provision a free trial key instantly ${c.dim('(no browser)')}`)
  log(`    status        Show current authentication state`)
  log(`    logout        Remove stored credentials`)
  log(`    token         Output API key to stdout ${c.dim('(for scripting)')}`)
  log('')
  log(`  Run ${c.cyan('skillboss auth <command> --help')} for details.`)
  log('')
}

function helpAuthLogin() {
  log('')
  log(`  ${c.bold('skillboss auth login')} - Sign in to a SkillBoss account`)
  log('')
  log('  Sign in to SkillBoss via your browser to get a permanent API key.')
  log('  This is the recommended way to authenticate.')
  log('')
  log('  What happens:')
  log(`    1. A trial key is provisioned automatically ${c.dim('(behind the scenes)')}`)
  log('    2. Your browser opens to skillboss.co')
  log('    3. You sign up or log in')
  log(`    4. Click "Bind & Transfer Credits" to link your trial`)
  log('    5. A permanent API key replaces the trial key')
  log('')
  log('  FLAGS')
  log(`    --help        Show this help`)
  log('')
  log('  EXAMPLES')
  log(`    ${c.dim('$')} skillboss auth login`)
  log('')
  log(`  See also: ${c.cyan('skillboss auth trial --help')} for non-interactive provisioning.`)
  log('')
}

function helpAuthTrial() {
  log('')
  log(`  ${c.bold('skillboss auth trial')} - Provision a free trial key`)
  log('')
  log('  Instantly provisions a trial API key with $0.25 free credit.')
  log('  No browser, no sign-up, no prompts.')
  log('')
  log('  Designed for agents and scripts that just need a working key.')
  log('  The key is saved to all credential stores and printed to stdout.')
  log('')
  log('  FLAGS')
  log(`    --help        Show this help`)
  log('')
  log('  EXAMPLES')
  log(`    ${c.dim('$')} skillboss auth trial`)
  log(`    ${c.dim('$')} export SKILLBOSS_API_KEY=$(skillboss auth trial)`)
  log('')
  log(`  To upgrade to a permanent account later: ${c.cyan('skillboss auth login')}`)
  log('')
}

function helpAuthStatus() {
  log('')
  log(`  ${c.bold('skillboss auth status')} - Show current authentication state`)
  log('')
  log('  Displays the current API key, where it was loaded from,')
  log('  whether it is a trial or permanent key, and your balance.')
  log('')
  log('  EXAMPLES')
  log(`    ${c.dim('$')} skillboss auth status`)
  log('')
}

function helpAuthLogout() {
  log('')
  log(`  ${c.bold('skillboss auth logout')} - Remove stored credentials`)
  log('')
  log('  Removes the API key from all credential stores:')
  log('    - ~/.config/skillboss/credentials.json')
  log('    - config.json (reset to placeholder)')
  log('    - Shell profile (SKILLBOSS_API_KEY)')
  log('')
  log('  EXAMPLES')
  log(`    ${c.dim('$')} skillboss auth logout`)
  log('')
}

function helpAuthToken() {
  log('')
  log(`  ${c.bold('skillboss auth token')} - Output API key to stdout`)
  log('')
  log('  Prints the current API key to stdout. If no key exists,')
  log('  a trial key is provisioned automatically.')
  log('')
  log('  Designed for scripting and piping. Status messages go to stderr.')
  log('')
  log('  EXAMPLES')
  log(`    ${c.dim('$')} skillboss auth token`)
  log(`    ${c.dim('$')} export SKILLBOSS_API_KEY=$(skillboss auth token)`)
  log(`    ${c.dim('$')} curl -H "Authorization: Bearer $(skillboss auth token)" ...`)
  log('')
}

// ── Commands ──────────────────────────────────────────────────────────

async function cmdLogin(flags) {
  if (flags.includes('--help') || flags.includes('-h')) {
    helpAuthLogin()
    return
  }

  const current = resolveKey()

  log('')

  // Already has a permanent key
  if (current?.type === 'permanent') {
    log(`  ${ok()} Already signed in with a permanent account.`)
    log(`    Key:    ${maskKey(current.key)}`)
    log(`    Source: ${current.source}`)
    log('')
    log(`  Run ${c.cyan('skillboss auth status')} to see your balance.`)
    log('')
    return
  }

  // Has a trial key — skip provisioning, go straight to browser upgrade
  if (current) {
    log(`  ${warn()} You have a trial key. Let's upgrade to a permanent account.`)
    log(`    Key: ${maskKey(current.key)}`)
    log('')
    await browserSignIn(current.key)
    return
  }

  // No key at all — provision trial behind the scenes, then browser upgrade
  log(`  ${c.bold('Signing in to SkillBoss...')}`)
  log('')

  const s = spinner('Preparing...')
  let data
  try {
    data = await provisionTempToken()
    s.stop(`Trial key ready ${c.dim(`($${data.balance_usd} credit)`)}`)
  } catch (err) {
    s.fail(`Failed: ${err.message}`)
    log('')
    log(`  Visit ${c.cyan(WEB_BASE)} to get an API key manually.`)
    log('')
    process.exit(1)
  }

  log('')
  persistKey(data.api_key, 'trial')
  log('')

  await browserSignIn(data.api_key)
}

async function cmdTrial(flags) {
  if (flags.includes('--help') || flags.includes('-h')) {
    helpAuthTrial()
    return
  }

  const current = resolveKey()

  // Already have a working key — just output it
  if (current) {
    log('')
    log(`  ${ok()} Already have a ${current.type || 'valid'} key.`)
    log(`    Key: ${maskKey(current.key)}`)
    log('')
    process.stdout.write(current.key)
    return
  }

  // Provision trial key
  log('')
  try {
    const data = await provisionTempToken()
    persistKey(data.api_key, 'trial')
    log(`  ${ok()} Trial key provisioned ${c.dim(`($${data.balance_usd} credit)`)}`)
    log('')
    log(`  Upgrade anytime: ${c.cyan('skillboss auth login')}`)
    log('')
    process.stdout.write(data.api_key)
  } catch (err) {
    log(`  ${fail()} ${err.message}`)
    log('')
    process.exit(1)
  }
}

/**
 * Browser-based sign-in flow.
 * Opens the bind URL, polls until the temp token is bound to a real account.
 */
async function browserSignIn(tempApiKey) {
  const bindUrl = `${WEB_BASE}/bind-token?temp_id=${encodeURIComponent(tempApiKey)}`

  const opened = openBrowser(bindUrl)
  if (opened) {
    log(`  ${ok()} Opened ${c.cyan(WEB_BASE)} in your browser`)
  } else {
    log(`  ${warn()} Could not open browser. Open this URL manually:`)
  }
  log(`    ${c.dim(bindUrl)}`)
  log('')
  log(`  Sign up or log in, then click ${c.bold('"Bind & Transfer Credits"')}.`)
  log('')

  // Poll for completion
  const s = spinner('Waiting for authentication...')
  const start = Date.now()

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS)

    try {
      const result = await pollBind(tempApiKey)

      if (result.status === 'bound' && result.permanent_api_key) {
        s.stop('Authentication complete!')
        log('')

        persistKey(result.permanent_api_key, 'permanent')

        if (result.migrated_usd > 0) {
          log(`  ${ok()} Migrated $${result.migrated_usd.toFixed(2)} trial credits`)
        }

        log('')
        log(`  ${c.bold(c.green("You're all set!"))}`)

        const prof = getShellProfile()
        if (prof) {
          log(`  Restart your shell or run: ${c.cyan(`source ~/${path.basename(prof)}`)}`)
        }
        log('')
        return
      }
    } catch {
      // Transient error — keep polling
    }
  }

  s.fail('Timed out (5 minutes)')
  log('')
  log(`  Complete sign-in at: ${c.cyan(bindUrl)}`)
  log(`  Then run ${c.cyan('skillboss auth login')} again.`)
  log('')
  process.exit(1)
}

async function cmdStatus(flags) {
  if (flags.includes('--help') || flags.includes('-h')) {
    helpAuthStatus()
    return
  }

  const current = resolveKey()

  log('')

  if (!current) {
    log(`  ${warn()} Not logged in`)
    log(`  Run ${c.cyan('skillboss auth login')} to sign in.`)
    log('')
    return
  }

  log(`  ${ok()} Logged in`)
  log(`    Key:    ${maskKey(current.key)}`)
  log(`    Source: ${current.source}`)

  try {
    const result = await pollBind(current.key)
    log(`    Type:   ${result.status === 'bound' ? 'permanent' : 'trial'}`)
    if (result.balance_usd !== undefined) {
      log(`    Balance: $${result.balance_usd.toFixed(2)}`)
    }
  } catch {
    log(`    Type:   permanent`)
  }

  log('')
}

async function cmdLogout(flags) {
  if (flags.includes('--help') || flags.includes('-h')) {
    helpAuthLogout()
    return
  }

  const current = resolveKey()

  log('')

  if (!current) {
    log(`  ${c.dim('Not logged in.')}`)
    log('')
    return
  }

  const answer = await prompt(`  ? ${c.bold('Log out?')} Remove ${maskKey(current.key)} ${c.dim('[y/N]')} `)
  if (answer.toLowerCase() !== 'y') {
    log('  Cancelled.')
    log('')
    return
  }

  removeGlobalCreds()
  log(`  ${ok()} Removed ~/.config/skillboss/credentials.json`)

  const config = loadLocalConfig()
  if (config) {
    config.apiKey = 'YOUR_API_KEY_HERE'
    saveLocalConfig(config)
    log(`  ${ok()} Reset config.json`)
  }

  const profile = removeFromShellProfile()
  if (profile) {
    log(`  ${ok()} Removed from ${path.basename(profile)}`)
  }

  log('')
}

async function cmdToken(flags) {
  if (flags.includes('--help') || flags.includes('-h')) {
    helpAuthToken()
    return
  }

  const current = resolveKey()
  if (current) {
    process.stdout.write(current.key)
    return
  }

  // Auto-provision
  try {
    const data = await provisionTempToken()
    persistKey(data.api_key, 'trial')
    process.stdout.write(data.api_key)
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`)
    process.exit(1)
  }
}

// ── Main ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]
const flags = args.slice(2)

async function main() {
  // skillboss --help
  if (!command || command === '--help' || command === '-h') {
    helpMain()
    process.exit(command ? 0 : 0)
  }

  if (command === 'auth') {
    // skillboss auth --help
    if (!subcommand || subcommand === '--help' || subcommand === '-h') {
      helpAuth()
      process.exit(subcommand ? 0 : 1)
    }

    switch (subcommand) {
      case 'login':   return cmdLogin(flags)
      case 'trial':   return cmdTrial(flags)
      case 'status':  return cmdStatus(flags)
      case 'logout':  return cmdLogout(flags)
      case 'token':   return cmdToken(flags)
      case 'resolve': return cmdToken(flags) // backward compat
      default:
        log('')
        log(`  ${c.red('Unknown command:')} auth ${subcommand}`)
        log(`  Run ${c.cyan('skillboss auth --help')} to see available commands.`)
        log('')
        process.exit(1)
    }
  }

  log('')
  log(`  ${c.red('Unknown command:')} ${command}`)
  log(`  Run ${c.cyan('skillboss --help')} to see available commands.`)
  log('')
  process.exit(1)
}

main().catch(err => {
  log(`\n  ${c.red('Error:')} ${err.message}\n`)
  process.exit(1)
})
