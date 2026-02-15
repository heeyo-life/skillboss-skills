# Skillboss Updater for Windows
# Run from inside the skillboss directory: .\install\update.ps1
# Or run from anywhere: & "C:\path\to\skillboss\install\update.ps1"

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillbossDir = Split-Path -Parent $ScriptDir
$ParentDir = Split-Path -Parent $SkillbossDir
$ConfigFile = Join-Path $SkillbossDir "config.json"
$DownloadUrl = "https://www.skillboss.co/api/skills/download"
$TempDir = Join-Path $env:TEMP "skillboss-update-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$BackupDir = Join-Path $ParentDir "skillboss.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "Skillboss Updater" -Color Cyan
Write-Host "=============================="
Write-Host ""

# 1. Check config.json exists and extract apiKey
if (-not (Test-Path $ConfigFile)) {
    Write-ColorOutput "Error: config.json not found at $ConfigFile" -Color Red
    Write-Host "Please ensure you have a valid skillboss installation."
    exit 1
}

$ConfigContent = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$ApiKey = $ConfigContent.apiKey

if ([string]::IsNullOrEmpty($ApiKey)) {
    Write-ColorOutput "Error: apiKey not found in config.json" -Color Red
    exit 1
}

Write-ColorOutput "OK" -Color Green
Write-Host " Found apiKey in config.json"

# 2. Create temp directory
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
    # 3. Download new version
    Write-ColorOutput "Downloading latest skillboss..." -Color Cyan
    $ZipPath = Join-Path $TempDir "skillboss.zip"

    $Headers = @{
        "Authorization" = "Bearer $ApiKey"
    }

    try {
        Invoke-WebRequest -Uri $DownloadUrl -Headers $Headers -OutFile $ZipPath -UseBasicParsing
    }
    catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        Write-ColorOutput "Error: Download failed (HTTP $StatusCode)" -Color Red
        if ($StatusCode -eq 401) {
            Write-Host "Your apiKey may be invalid. Please re-download from https://www.skillboss.co/console"
        }
        exit 1
    }

    Write-ColorOutput "OK" -Color Green
    Write-Host " Downloaded successfully"

    # 5. Backup existing installation
    Write-ColorOutput "Backing up current installation to $BackupDir..." -Color Cyan
    Move-Item $SkillbossDir $BackupDir

    # 6. Extract new version
    Write-ColorOutput "Extracting new version..." -Color Cyan
    Expand-Archive -Path $ZipPath -DestinationPath $ParentDir -Force

    # 7. Done (new config.json from server already contains user's apiKey)
    Write-Host ""
    Write-Host "=============================="
    Write-ColorOutput "Update complete!" -Color Green
    Write-Host ""
    Write-Host "Old version backed up to:"
    Write-Host "  $BackupDir"
    Write-Host ""
    Write-Host "You can delete the backup after verifying the update works."
}
finally {
    # Cleanup temp directory
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
