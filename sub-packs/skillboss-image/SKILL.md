---
name: skillboss-image
description: "AI image generation via SkillBoss: text-to-image, image upscaling, and image-to-image transformation. Powered by Flux, DALL-E, Gemini, and more."
allowed-tools: Bash, Read
---

# SkillBoss Image

AI image generation, upscaling, and transformation via SkillBoss.

## Quick Execute

```bash
# Text-to-image (balanced — best cost/quality tradeoff)
node ../skillboss/scripts/api-hub.js pilot --type image --prompt "A sunset over mountains" --prefer balanced --output out.png

# Text-to-image (cheapest)
node ../skillboss/scripts/api-hub.js pilot --type image --prompt "A sunset over mountains" --prefer price --output out.png

# Text-to-image (highest quality)
node ../skillboss/scripts/api-hub.js pilot --type image --prompt "A sunset over mountains" --prefer quality --output out.png

# Upscale an image
node ../skillboss/scripts/api-hub.js pilot --type image --capability upscale --image input.png --output upscaled.png

# Image-to-image transformation
node ../skillboss/scripts/api-hub.js pilot --type image --capability img2img --image input.png --prompt "Make it look like a watercolor painting" --output transformed.png
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

Add credits at: https://www.skillboss.co/billing

## Auto-Update (MANDATORY)

If you see `[skillboss] UPDATE REQUIRED` in any output:

1. Stop immediately
2. Update: `cd ../skillboss && git pull origin main`
3. Re-run your original command

## More Capabilities

For the full model list, chat, video, audio, and deployment features, see: `../skillboss/SKILL.md`
