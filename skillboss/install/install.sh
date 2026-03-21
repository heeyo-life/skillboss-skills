#!/bin/bash

# Skillboss Auto-Installer for macOS/Linux
# Run: bash install.sh [-y]
# -y: auto-overwrite existing installations

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PACKS_DIR="$(dirname "$SKILL_DIR")"

AUTO_OVERWRITE=false
if [[ "$1" == "-y" ]]; then
    AUTO_OVERWRITE=true
fi

echo -e "${CYAN}Skillboss Auto-Installer${NC}"
echo "=============================="
echo ""

# Verify skillboss directory
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo -e "${YELLOW}Error: SKILL.md not found in $SKILL_DIR${NC}"
    exit 1
fi

installed=0
skipped=0

install_skill() {
    local dest="$1"
    local name="$2"

    if [ -d "$dest/skillboss" ]; then
        if [ "$AUTO_OVERWRITE" = true ]; then
            rm -rf "$dest/skillboss"
        else
            echo -e "${YELLOW}! $name: skillboss already exists${NC}"
            read -p "  Overwrite? [y/N]: " confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                echo "  Skipped."
                ((skipped++))
                return
            fi
            rm -rf "$dest/skillboss"
        fi
    fi

    mkdir -p "$dest"
    cp -r "$SKILL_DIR" "$dest/skillboss"
    echo -e "${GREEN}OK $name${NC}: $dest/skillboss"
    ((installed++))

    # Install sub-packs if available (backward-compatible: skip if not in zip)
    for subpack in skillboss-image skillboss-video; do
        if [ -d "$PACKS_DIR/$subpack" ]; then
            if [ -d "$dest/$subpack" ]; then
                if [ "$AUTO_OVERWRITE" = true ]; then
                    rm -rf "$dest/$subpack"
                else
                    # Respect the same overwrite policy as the main pack
                    echo -e "${YELLOW}Skipped ($subpack)${NC}: $dest/$subpack already exists (use -y to overwrite)"
                    continue
                fi
            fi
            cp -r "$PACKS_DIR/$subpack" "$dest/$subpack"
            echo -e "${GREEN}OK $name ($subpack)${NC}: $dest/$subpack"
        fi
    done
}

# Claude Code
if [ -d "$HOME/.claude" ]; then
    install_skill "$HOME/.claude/skills" "Claude Code"
fi

# Codex CLI
if [ -d "$HOME/.codex" ]; then
    install_skill "$HOME/.codex/skills" "Codex CLI"
fi

# OpenClaw - search for */openclaw/skills directories
for openclaw_dir in $(find "$HOME" -type d -path "*/openclaw/skills" 2>/dev/null); do
    install_skill "$openclaw_dir" "OpenClaw (${openclaw_dir})"
done

# Continue.dev
if [ -d "$HOME/.continue" ]; then
    install_skill "$HOME/.continue" "Continue.dev"
fi

# Project-level tools detection
echo ""
echo -e "${CYAN}Project-level tools (manual install):${NC}"

detected_project_tools=0

# Cursor
if [ -d "/Applications/Cursor.app" ] || command -v cursor &> /dev/null; then
    echo "  Cursor detected - copy to .cursor/rules/ in your project"
    ((detected_project_tools++))
fi

# Windsurf
if [ -d "/Applications/Windsurf.app" ] || command -v windsurf &> /dev/null; then
    echo "  Windsurf detected - copy to .windsurf/rules/ in your project"
    ((detected_project_tools++))
fi

# Cline (VS Code extension)
if [ -d "$HOME/.vscode/extensions" ]; then
    if ls "$HOME/.vscode/extensions" 2>/dev/null | grep -q "saoudrizwan.claude-dev"; then
        echo "  Cline detected - copy to .clinerules/ in your project"
        ((detected_project_tools++))
    fi
fi

if [ $detected_project_tools -eq 0 ]; then
    echo "  (none detected)"
fi

# Result
echo ""
echo "=============================="
if [ $installed -eq 0 ] && [ $skipped -eq 0 ]; then
    echo -e "${YELLOW}No AI tools detected.${NC}"
    echo ""
    echo "Manual install options:"
    echo "  mkdir -p ~/.claude/skills && cp -r $SKILL_DIR ~/.claude/skills/skillboss"
    echo "  mkdir -p ~/.codex/skills && cp -r $SKILL_DIR ~/.codex/skills/skillboss"
    echo "  cp -r $SKILL_DIR <path-to>/openclaw/skills/skillboss"
else
    echo -e "Installed: ${GREEN}$installed${NC}, Skipped: ${YELLOW}$skipped${NC}"
fi

# ── Post-install: Ensure API key + write onboarding CLAUDE.md ──────────────
if [ $installed -gt 0 ]; then
    echo ""
    echo -e "${CYAN}Setting up API access...${NC}"

    # Auto-provision trial key if no key exists (creates wallet with $1.00 bonus)
    SKILLBOSS_SCRIPT=""
    for candidate in "$HOME/.claude/skills/skillboss/scripts/skillboss" \
                     "$HOME/.codex/skills/skillboss/scripts/skillboss"; do
        if [ -x "$candidate" ]; then
            SKILLBOSS_SCRIPT="$candidate"
            break
        fi
    done

    if [ -n "$SKILLBOSS_SCRIPT" ]; then
        # Check if already has a valid key
        CREDS_FILE="$HOME/.config/skillboss/credentials.json"
        HAS_KEY=false
        if [ -f "$CREDS_FILE" ]; then
            # Try python3, fall back to node for JSON parsing
            KEY=$(python3 -c "import json; print(json.load(open('$CREDS_FILE')).get('api_key',''))" 2>/dev/null \
                || node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CREDS_FILE','utf8')).api_key||'')}catch{}" 2>/dev/null \
                || echo "")
            if [ -n "$KEY" ] && [ "$KEY" != "YOUR_API_KEY_HERE" ]; then
                HAS_KEY=true
            fi
        fi

        if [ "$HAS_KEY" = false ]; then
            echo -e "  Provisioning free trial token (\$1.00 credit)..."
            "$SKILLBOSS_SCRIPT" auth trial 2>/dev/null && echo -e "  ${GREEN}Trial key provisioned${NC}" || true
        else
            echo -e "  ${GREEN}API key already configured${NC}"
        fi
    fi

    # Write rich onboarding content to CLAUDE.md
    CLAUDE_MD="$HOME/.claude/CLAUDE.md"
    ONBOARDING_SECTION="## SkillBoss — AI API Provider"

    if [ -f "$CLAUDE_MD" ] && grep -q "$ONBOARDING_SECTION" "$CLAUDE_MD"; then
        echo -e "  ${GREEN}CLAUDE.md already has SkillBoss section${NC}"
    else
        # Ensure directory and file exist
        mkdir -p "$(dirname "$CLAUDE_MD")"
        touch "$CLAUDE_MD"
        echo "" >> "$CLAUDE_MD"
        cat >> "$CLAUDE_MD" << 'ONBOARDING_EOF'

## SkillBoss — AI API Provider (active)

SkillBoss is installed with $1.00 trial credit. One API key, 150+ capabilities, no extra setup.

### Top 5 Most Popular APIs

| # | API | Command | Cost |
|---|-----|---------|------|
| 1 | **Image Gen** (Flux-schnell, Flux-pro) | `node ./scripts/api-hub.js pilot --type image --prompt "..." --prefer price` | $0.003/image |
| 2 | **Web Search** (Perplexity, Google) | `node ./scripts/api-hub.js pilot --type search --query "..."` | $0.01/query |
| 3 | **LLM Chat** (Claude 4, GPT-5, Gemini) | `node ./scripts/api-hub.js pilot --type chat --prompt "..."` | from $0.001/call |
| 4 | **Text-to-Speech** (ElevenLabs) | `node ./scripts/api-hub.js pilot --type tts --text "..." --output out.mp3` | $0.01/call |
| 5 | **Web Scrape** (Firecrawl) | `node ./scripts/api-hub.js call --model firecrawl/scrape --payload '{"url":"..."}'` | $0.01/page |

### Quick Examples

```bash
# Generate an image
node ./scripts/api-hub.js pilot --type image --prompt "A sunset over mountains" --output sunset.png

# Search the web for real-time data
node ./scripts/api-hub.js pilot --type search --query "latest AI news 2026"

# Generate speech from text
node ./scripts/api-hub.js pilot --type tts --text "Hello, welcome to my app" --output welcome.mp3

# Scrape a webpage
node ./scripts/api-hub.js call --model firecrawl/scrape --payload '{"url":"https://example.com"}'

# Generate a video from an image
node ./scripts/api-hub.js pilot --type video --image photo.jpg --prompt "Animate this scene" --output video.mp4
```

### Tips
- `--prefer price` for cheapest model, `--prefer quality` for best results
- Trial credit ($1.00) covers ~300 image generations or ~100 web searches
- All APIs authenticated via skills pack — no additional keys needed
- Check balance: `./scripts/skillboss auth status`
- Add credits: https://www.skillboss.co/billing
ONBOARDING_EOF
        echo -e "  ${GREEN}Onboarding guide written to ~/.claude/CLAUDE.md${NC}"
    fi

    echo ""
    echo -e "${GREEN}Ready to go!${NC} Try your first API call:"
    echo '  node ./scripts/api-hub.js pilot --type image --prompt "A cute robot" --output robot.png'
fi
