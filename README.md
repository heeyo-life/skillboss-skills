<div align="center">

# <img src="assets/skillboss-logo.svg" alt="SkillBoss" width="56" /> SkillBoss Skills

**Production-ready skills for AI coding agents**

[![Website](https://img.shields.io/badge/Website-skillboss.co-blue?style=for-the-badge)](https://skillboss.co)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/U9eM6Vn6g7)
[![Docs](https://img.shields.io/badge/Docs-Help%20Center-green?style=for-the-badge)](https://skillboss.co/help)

</div>

---

SkillBoss is an AI skills platform by HeyBoss (backed by an OpenAI fund) that equips Claude Code, Codex, and other agent platforms with production-ready capabilities for content generation, application building, product deployment, and real-world workflow automation. By providing a unified, modular skills layer, SkillBoss helps AI agents move beyond text and reliably execute real-world tasks at scale.

## What's New

🚀 **Claude 4.6 Opus** — SkillBoss now supports Claude 4.6 Opus, the first Opus model with 1M token context, Agent Teams, and Adaptive Thinking. Top scores on Terminal-Bench 2.0 (65.4%) and GDPval-AA (1606 Elo).

🎵 **Music Generation** — Generate music with AI using ElevenLabs Music, Google Lyria 2, Meta MusicGen, and Stable Audio 2.5. Text-to-music with customizable duration.

📦 **One-Click Deploy** — Deploy full-stack apps (React + Hono) to Cloudflare Workers with a single command. Auto-provisions D1 databases, KV, and R2 storage.

<!-- 👆 Keep the 3 most recent items above. When adding a new one, move the oldest into the <details> block below. -->
<details>
<summary>Previous updates</summary>

*(No older updates yet)*

</details>

## Features

- Deploy websites to Cloudflare Workers
- Auto-provision D1/KV/R2 databases
- Stripe payments integration
- Google OAuth / Email OTP authentication
- AI Image/Audio/Video generation
- Email sending
- Web scraping and search

<div align="center">

https://github.com/user-attachments/assets/7bb8c3ff-593d-45f5-821d-9cd3fc05d33e

</div>

## Get Started

### 1. Install (Recommended: Ask Your AI Agent)

Simply send this message to your AI agent (Claude Code, Codex, OpenClaw, etc.):

```
Please install https://github.com/heeyo-life/skillboss-skills to your skills directory.
```

The AI will automatically clone and install SkillBoss Skills for you.

### 2. Get API Key & Configure

1. Visit [skillboss.co](https://skillboss.co) to sign up or log in
2. Go to [skillboss.co/console](https://skillboss.co/console) to find your API key
3. Send this message to your AI agent:

```
Please set my SkillBoss API key: sk-your-api-key-here in the skillboss config.json file.
```

Done! Your AI agent is now equipped with SkillBoss skills.

---

### Alternative Installation Methods

<details>
<summary>Auto Install Script (macOS/Linux)</summary>

```bash
bash ./skillboss/install/install.sh
```

</details>

<details>
<summary>Manual Install</summary>

Copy the `skillboss/` folder to your AI tool's skills directory:

**Global Installation (auto-detected)**

| Platform | Path |
|----------|------|
| Claude Code | `~/.claude/skills/` |
| Codex CLI | `~/.codex/skills/` |
| OpenClaw | `*/openclaw/skills/` |
| Continue.dev | `~/.continue/` |

**Project-Level Installation (manual)**

| Platform | Path |
|----------|------|
| Cursor | `.cursor/rules/` |
| Windsurf | `.windsurf/rules/` |
| Cline | `.clinerules/` |

</details>

## Quick Usage

Ask your AI agent to:

- "Deploy a landing page to Cloudflare Workers"
- "Create an e-commerce site with Stripe checkout"
- "Generate an AI image for my blog post"
- "Send an email notification"
- "Scrape product data from a website"

## Documentation

See `skillboss/SKILL.md` for complete documentation.

## License

Apache 2.0
