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
