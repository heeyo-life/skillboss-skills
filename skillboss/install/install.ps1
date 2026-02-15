# Skillboss Auto-Installer for Windows
# Run: powershell -ExecutionPolicy Bypass -File install.ps1 [-y]
# -y: auto-overwrite existing installations

param(
    [switch]$y
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir

Write-Host "Skillboss Auto-Installer" -ForegroundColor Cyan
Write-Host "=============================="
Write-Host ""

# Verify skillboss directory
$skillMdPath = Join-Path $SkillDir "SKILL.md"
if (-not (Test-Path $skillMdPath)) {
    Write-Host "Error: SKILL.md not found in $SkillDir" -ForegroundColor Yellow
    exit 1
}

$installed = 0
$skipped = 0

function Install-Skill {
    param($Dest, $Name)

    $targetPath = Join-Path $Dest "skillboss"

    if (Test-Path $targetPath) {
        if ($y) {
            Remove-Item -Recurse -Force $targetPath
        } else {
            Write-Host "! $Name`: skillboss already exists" -ForegroundColor Yellow
            $confirm = Read-Host "  Overwrite? [y/N]"
            if ($confirm -notmatch '^[Yy]$') {
                Write-Host "  Skipped."
                $script:skipped++
                return
            }
            Remove-Item -Recurse -Force $targetPath
        }
    }

    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    Copy-Item -Recurse -Force $SkillDir $targetPath
    Write-Host "OK $Name`: $targetPath" -ForegroundColor Green
    $script:installed++
}

# Claude Code
$claudeDir = "$env:USERPROFILE\.claude"
if (Test-Path $claudeDir) {
    Install-Skill "$claudeDir\skills" "Claude Code"
}

# Codex CLI
$codexDir = "$env:USERPROFILE\.codex"
if (Test-Path $codexDir) {
    Install-Skill "$codexDir\skills" "Codex CLI"
}

# OpenClaw - search for */openclaw/skills directories
$openclawDirs = Get-ChildItem -Path $env:USERPROFILE -Recurse -Directory -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*\openclaw\skills" }
foreach ($dir in $openclawDirs) {
    Install-Skill $dir.FullName "OpenClaw ($($dir.FullName))"
}

# Continue.dev
$continueDir = "$env:USERPROFILE\.continue"
if (Test-Path $continueDir) {
    Install-Skill $continueDir "Continue.dev"
}

# Project-level tools detection
Write-Host ""
Write-Host "Project-level tools (manual install):" -ForegroundColor Cyan

$detectedProjectTools = 0

# Cursor
$cursorPaths = @(
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
    "$env:PROGRAMFILES\Cursor\Cursor.exe"
)
foreach ($p in $cursorPaths) {
    if (Test-Path $p) {
        Write-Host "  Cursor detected - copy to .cursor\rules\ in your project"
        $detectedProjectTools++
        break
    }
}

# Windsurf
$windsurfPaths = @(
    "$env:LOCALAPPDATA\Programs\windsurf\Windsurf.exe",
    "$env:PROGRAMFILES\Windsurf\Windsurf.exe"
)
foreach ($p in $windsurfPaths) {
    if (Test-Path $p) {
        Write-Host "  Windsurf detected - copy to .windsurf\rules\ in your project"
        $detectedProjectTools++
        break
    }
}

# Cline (VS Code extension)
$vscodeExtDir = "$env:USERPROFILE\.vscode\extensions"
if (Test-Path $vscodeExtDir) {
    $clineExt = Get-ChildItem $vscodeExtDir -Directory | Where-Object { $_.Name -like "saoudrizwan.claude-dev*" }
    if ($clineExt) {
        Write-Host "  Cline detected - copy to .clinerules\ in your project"
        $detectedProjectTools++
    }
}

if ($detectedProjectTools -eq 0) {
    Write-Host "  (none detected)"
}

# Result
Write-Host ""
Write-Host "=============================="
if ($installed -eq 0 -and $skipped -eq 0) {
    Write-Host "No AI tools detected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual install options:"
    Write-Host "  Copy $SkillDir to %USERPROFILE%\.claude\skills\skillboss"
    Write-Host "  Copy $SkillDir to %USERPROFILE%\.codex\skills\skillboss"
    Write-Host "  Copy $SkillDir to <path-to>\openclaw\skills\skillboss"
} else {
    Write-Host "Installed: $installed, Skipped: $skipped"
}
