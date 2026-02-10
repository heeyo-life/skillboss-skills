#!/bin/bash

# Skillboss Updater for macOS/Linux
# Run from inside the skillboss directory: bash install/update.sh
# Or run from anywhere: bash /path/to/skillboss/install/update.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLBOSS_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$SKILLBOSS_DIR")"
CONFIG_FILE="$SKILLBOSS_DIR/config.json"
DOWNLOAD_URL="https://www.skillboss.co/api/skills/download"
TEMP_DIR=$(mktemp -d)
BACKUP_DIR="$PARENT_DIR/skillboss.backup.$(date +%Y%m%d-%H%M%S)"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo -e "${CYAN}Skillboss Updater${NC}"
echo "=============================="
echo ""

# 1. Check config.json exists and extract apiKey
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: config.json not found at $CONFIG_FILE${NC}"
    echo "Please ensure you have a valid skillboss installation."
    exit 1
fi

API_KEY=$(grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: apiKey not found in config.json${NC}"
    exit 1
fi

echo -e "${GREEN}OK${NC} Found apiKey in config.json"

# 2. Download new version
echo -e "${CYAN}Downloading latest skillboss...${NC}"
HTTP_CODE=$(curl -s -w "%{http_code}" -L \
    -H "Authorization: Bearer $API_KEY" \
    -o "$TEMP_DIR/skillboss.zip" \
    "$DOWNLOAD_URL")

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}Error: Download failed (HTTP $HTTP_CODE)${NC}"
    if [ "$HTTP_CODE" == "401" ]; then
        echo "Your apiKey may be invalid. Please re-download from https://www.skillboss.co/console"
    fi
    exit 1
fi

echo -e "${GREEN}OK${NC} Downloaded successfully"

# 4. Verify zip file
if ! unzip -t "$TEMP_DIR/skillboss.zip" > /dev/null 2>&1; then
    echo -e "${RED}Error: Downloaded file is not a valid zip${NC}"
    exit 1
fi

# 5. Backup existing installation
echo -e "${CYAN}Backing up current installation to $BACKUP_DIR...${NC}"
mv "$SKILLBOSS_DIR" "$BACKUP_DIR"

# 6. Extract new version
echo -e "${CYAN}Extracting new version...${NC}"
unzip -q "$TEMP_DIR/skillboss.zip" -d "$PARENT_DIR"

# 7. Done (new config.json from server already contains user's apiKey)
echo ""
echo "=============================="
echo -e "${GREEN}Update complete!${NC}"
echo ""
echo "Old version backed up to:"
echo "  $BACKUP_DIR"
echo ""
echo "You can delete the backup after verifying the update works."
