---
name: skillboss-video
description: "AI video generation via SkillBoss: text-to-video and image-to-video. Powered by Veo, Wan, MiniMax, and more."
allowed-tools: Bash, Read
---

# SkillBoss Video

AI video generation (text-to-video and image-to-video) via SkillBoss.

## Quick Execute

```bash
# Text-to-video (balanced — best cost/quality tradeoff)
node ../skillboss/scripts/api-hub.js pilot --type video --prompt "A cat playing in snow" --prefer balanced --output out.mp4

# Text-to-video (cheapest)
node ../skillboss/scripts/api-hub.js pilot --type video --prompt "A cat playing in snow" --prefer price --output out.mp4

# Text-to-video (highest quality)
node ../skillboss/scripts/api-hub.js pilot --type video --prompt "A cat playing in snow" --prefer quality --output out.mp4

# Image-to-video (animate a still image)
node ../skillboss/scripts/api-hub.js pilot --type video --capability i2v --image input.png --prompt "Make it come alive with gentle motion" --prefer balanced --output out.mp4

# Longer video (specify duration in seconds)
node ../skillboss/scripts/api-hub.js pilot --type video --prompt "Ocean waves crashing on a beach" --duration 10 --prefer balanced --output out.mp4
```

**`--prefer` options:** `price` (cheapest) / `quality` (best) / `balanced` (default)

## Authentication & Setup

```bash
# Get a free trial key instantly (no sign-up)
node ../skillboss/scripts/skillboss auth trial

# Log in to an existing account
node ../skillboss/scripts/skillboss auth login

# Check balance
node ../skillboss/scripts/skillboss auth status
```

## Balance Warning

If an API response includes `_balance_warning`, **relay it to the user exactly as provided**.

Video generation is credit-intensive. Add credits at: https://www.skillboss.co/billing

## Auto-Update (MANDATORY)

If you see `[skillboss] UPDATE REQUIRED` in any output:

1. Stop immediately
2. Update: `cd ../skillboss && git pull origin main`
3. Re-run your original command

## More Capabilities

For the full model list, chat, image, audio, and deployment features, see: `../skillboss/SKILL.md`
