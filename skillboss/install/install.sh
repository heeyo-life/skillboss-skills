#!/bin/bash

# Skillboss Auto-Installer for macOS/Linux
# Run: bash install.sh [-y]
# -y: auto-overwrite existing installations
#
# For AI-first installation with auto-configuration:
#   curl -fsSL https://skillboss.co/install.sh | bash
#   or with API key: SKILLBOSS_API_KEY=sk-xxx bash install.sh

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

# Check if API key is provided via env var
API_KEY_PROVIDED=""
if [ -n "$SKILLBOSS_API_KEY" ]; then
    API_KEY_PROVIDED="$SKILLBOSS_API_KEY"
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

# Configure API key if installation was successful
if [ $installed -gt 0 ]; then
    echo ""
    echo -e "${CYAN}Configuration${NC}"
    echo "=============================="

    # Check if skillboss CLI is available
    SKILLBOSS_CLI=""
    if [ -x "$SKILL_DIR/scripts/skillboss" ]; then
        SKILLBOSS_CLI="$SKILL_DIR/scripts/skillboss"
    elif command -v skillboss &> /dev/null; then
        SKILLBOSS_CLI="skillboss"
    fi

    # If API key was provided via env, configure it
    if [ -n "$API_KEY_PROVIDED" ]; then
        echo -e "${GREEN}API key detected${NC} - configuring..."

        # Save to global config
        CONFIG_DIR="$HOME/.config/skillboss"
        CREDS_FILE="$CONFIG_DIR/credentials.json"
        mkdir -p "$CONFIG_DIR"

        cat > "$CREDS_FILE" <<EOF
{
  "api_key": "$API_KEY_PROVIDED",
  "type": "permanent",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
        chmod 600 "$CREDS_FILE"

        # Update config.json if it exists
        if [ -f "$SKILL_DIR/config.json" ]; then
            # Simple JSON update using sed (works without jq)
            sed -i.bak "s|\"apiKey\": \"[^\"]*\"|\"apiKey\": \"$API_KEY_PROVIDED\"|" "$SKILL_DIR/config.json"
            rm -f "$SKILL_DIR/config.json.bak"
        fi

        echo -e "${GREEN}✓ API key configured${NC}"
        echo ""
        echo -e "${GREEN}Installation complete!${NC} Run your AI assistant to start using SkillBoss."
    else
        # No API key provided - guide user to authenticate
        echo ""
        echo -e "${YELLOW}API key not configured yet.${NC}"
        echo ""
        echo "To complete setup, choose one of these options:"
        echo ""

        if [ -n "$SKILLBOSS_CLI" ]; then
            echo -e "  ${CYAN}Option 1 (Recommended):${NC} Authenticate with your SkillBoss account"
            echo "    $SKILLBOSS_CLI auth login"
            echo ""
            echo -e "  ${CYAN}Option 2:${NC} Get a free trial key (no sign-up)"
            echo "    $SKILLBOSS_CLI auth trial"
            echo ""
        else
            echo -e "  ${CYAN}Option 1:${NC} Sign in at ${CYAN}https://www.skillboss.co${NC}"
            echo "    Copy your API key from the dashboard"
            echo ""
        fi

        echo -e "  ${CYAN}Option 3:${NC} Re-run installer with API key:"
        echo "    SKILLBOSS_API_KEY=sk-xxx bash install.sh -y"
        echo ""
    fi
fi
