#Requires -Version 5.1
<#
.SYNOPSIS
    Get Apna Driver — one-command environment setup (Windows).

.DESCRIPTION
    Installs/verifies Node.js and Docker Desktop, provisions PostgreSQL
    (PostGIS) + Redis via the project's own docker-compose.yml, generates a
    safe local .env from .env.example (filling in only what's needed to
    boot — never touching a value you've already customized), installs
    dependencies, and runs prisma generate -> migrate deploy -> seed.

    Mirrors scripts/setup.sh (Linux/macOS) step for step.

.PARAMETER Yes
    Non-interactive: assume "yes" to every prompt (required installs
    proceed without asking).

.PARAMETER SkipInfra
    Don't touch Docker/Postgres/Redis containers — use this when
    DATABASE_URL/REDIS_URL already point at a managed/remote database.

.PARAMETER SkipSeed
    Run migrations but skip prisma/seed.ts. Recommended for a real
    production database — the seed creates demo admin/customer/driver
    accounts meant for local development only.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Yes -SkipSeed
#>
param(
    [switch]$Yes,
    [switch]$SkipInfra,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'
$RequiredNodeMajor = 22

function Write-Step($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-WarnMsg($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-FailMsg($msg) { Write-Host "  [X] $msg" -ForegroundColor Red; exit 1 }

function Confirm-Action($question) {
    if ($Yes) { return $true }
    $reply = Read-Host "  [?] $question [y/N]"
    return $reply -match '^[Yy]$'
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Assert-Command($name) {
    if (-not (Test-Command $name)) {
        Write-FailMsg "Required command '$name' is still not available after setup. Install it manually and re-run this script."
    }
}

# ---------------------------------------------------------------------------
# Resolve repo root regardless of where this script is invoked from
# ---------------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

if (-not (Test-Path 'package.json')) {
    Write-FailMsg "Could not find package.json in $RepoRoot — is this script still inside the project's scripts\ directory?"
}

Write-Step "Get Apna Driver — environment setup"
Write-Host "    Repo root: $RepoRoot"
if ($SkipInfra) { Write-Host "    Mode: -SkipInfra (assuming an external/managed database)" }
if ($SkipSeed)  { Write-Host "    Mode: -SkipSeed (migrations only, no demo data)" }
Write-Host ""

# ---------------------------------------------------------------------------
# 1. winget availability (needed for any auto-install below)
# ---------------------------------------------------------------------------
$HasWinget = Test-Command 'winget'
if (-not $HasWinget) {
    Write-WarnMsg "winget was not found — automatic installs below will be skipped; you'll need to install Node.js/Docker Desktop manually if missing. (winget ships with App Installer from the Microsoft Store on Windows 10 2004+/11.)"
}

# ---------------------------------------------------------------------------
# 2. Node.js — verify version, install via winget if missing/too old
# ---------------------------------------------------------------------------
Write-Step "Checking Node.js (need >= v$RequiredNodeMajor)"

function Get-NodeMajorVersion {
    if (-not (Test-Command 'node')) { return 0 }
    $v = (node -p "process.versions.node.split('.')[0]") 2>$null
    if (-not $v) { return 0 }
    return [int]$v
}

$currentNodeMajor = Get-NodeMajorVersion

if ($currentNodeMajor -ge $RequiredNodeMajor) {
    Write-Ok "Node.js $(node -v) already satisfies the requirement."
} else {
    if ($currentNodeMajor -eq 0) {
        Write-WarnMsg "Node.js was not found."
    } else {
        Write-WarnMsg "Found Node.js major version $currentNodeMajor — this project needs >= $RequiredNodeMajor."
    }

    if ($HasWinget -and (Confirm-Action "Install Node.js $RequiredNodeMajor LTS via winget?")) {
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        Write-WarnMsg "Open a NEW PowerShell window (so PATH picks up Node), then re-run this script to continue."
        exit 0
    } else {
        Write-FailMsg "Node.js >= $RequiredNodeMajor is required. Install it from https://nodejs.org and re-run this script."
    }
}
Assert-Command 'npm'

# ---------------------------------------------------------------------------
# 3. Docker Desktop (skipped entirely with -SkipInfra)
# ---------------------------------------------------------------------------
$DockerComposeCmd = $null

if ($SkipInfra) {
    Write-WarnMsg "Skipping Docker/Postgres/Redis setup (-SkipInfra) — make sure DATABASE_URL and REDIS_URL in .env already point at a reachable database."
} else {
    Write-Step "Checking Docker"

    if (-not (Test-Command 'docker')) {
        Write-WarnMsg "Docker was not found."
        if ($HasWinget -and (Confirm-Action "Install Docker Desktop via winget now? (Requires a sign-out/restart and WSL2 to finish setup.)")) {
            winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
            Write-WarnMsg "Docker Desktop was installed. Launch it from the Start Menu, complete its first-run setup (it may require enabling WSL2 and a restart), then re-run this script."
            exit 0
        } else {
            Write-FailMsg "Docker Desktop is required to provision Postgres/Redis locally. Install it from https://www.docker.com/products/docker-desktop/, or re-run with -SkipInfra if you're using a managed database."
        }
    }
    Assert-Command 'docker'

    $composeOk = $false
    try { docker compose version | Out-Null; $composeOk = $true } catch { $composeOk = $false }
    if ($composeOk) {
        $DockerComposeCmd = @('docker', 'compose')
    } else {
        Write-FailMsg "Docker is installed but 'docker compose' is not available. Update Docker Desktop (it bundles Compose v2) and re-run."
    }
    Write-Ok "Docker ready."

    try {
        docker info | Out-Null
    } catch {
        Write-FailMsg "Docker is installed but the daemon isn't reachable — open Docker Desktop and wait for it to say 'running', then re-run this script."
    }
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ComposeArgs)
    & $DockerComposeCmd[0] $DockerComposeCmd[1..($DockerComposeCmd.Length - 1)] @ComposeArgs
}

# ---------------------------------------------------------------------------
# 4. .env — create from .env.example, fill in only what's needed to boot
# ---------------------------------------------------------------------------
Write-Step "Preparing .env"

if (-not (Test-Path '.env')) {
    if (-not (Test-Path '.env.example')) {
        Write-FailMsg ".env.example is missing — cannot generate a starting .env. Restore it from version control."
    }
    Copy-Item '.env.example' '.env'
    Write-Ok "Created .env from .env.example."
} else {
    Write-Ok ".env already exists — only filling in missing pieces, never overwriting values you've set."
}

function Get-EnvValue($key) {
    $line = Get-Content '.env' | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if (-not $line) { return '' }
    return ($line -split '=', 2)[1]
}

function Set-EnvValue($key, $value) {
    $content = Get-Content '.env'
    $pattern = "^$key="
    if ($content -match $pattern) {
        $updated = $content | ForEach-Object { if ($_ -match $pattern) { "$key=$value" } else { $_ } }
        Set-Content '.env' $updated
    } else {
        Add-Content '.env' "$key=$value"
    }
}

function New-RandomHex($byteLength) {
    return (node -e "console.log(require('crypto').randomBytes($byteLength).toString('hex'))")
}

# Docker-compose needs these component variables; .env.example only ships
# the combined DATABASE_URL/REDIS_URL, so generate sane local defaults for
# whichever of these are still missing.
if (-not (Get-EnvValue 'POSTGRES_USER')) { Set-EnvValue 'POSTGRES_USER' 'gad_app' }
if (-not (Get-EnvValue 'POSTGRES_DB')) { Set-EnvValue 'POSTGRES_DB' 'get_apna_driver' }
if (-not (Get-EnvValue 'POSTGRES_PORT')) { Set-EnvValue 'POSTGRES_PORT' '5432' }
if (-not (Get-EnvValue 'REDIS_PORT')) { Set-EnvValue 'REDIS_PORT' '6379' }
if (-not (Get-EnvValue 'POSTGRES_PASSWORD')) {
    Set-EnvValue 'POSTGRES_PASSWORD' (New-RandomHex 24)
    Write-Ok "Generated a random POSTGRES_PASSWORD."
}

$pgUser = Get-EnvValue 'POSTGRES_USER'
$pgPassword = Get-EnvValue 'POSTGRES_PASSWORD'
$pgDb = Get-EnvValue 'POSTGRES_DB'
$pgPort = Get-EnvValue 'POSTGRES_PORT'
$redisPort = Get-EnvValue 'REDIS_PORT'

$currentDatabaseUrl = Get-EnvValue 'DATABASE_URL'
if ([string]::IsNullOrEmpty($currentDatabaseUrl) -or $currentDatabaseUrl -like '*DB_USER:DB_PASSWORD@DB_HOST*') {
    Set-EnvValue 'DATABASE_URL' "postgresql://${pgUser}:${pgPassword}@localhost:${pgPort}/${pgDb}"
    Write-Ok "Set DATABASE_URL to the local Docker Postgres instance."
}

$currentRedisUrl = Get-EnvValue 'REDIS_URL'
if ([string]::IsNullOrEmpty($currentRedisUrl) -or $currentRedisUrl -like '*redis-host*') {
    Set-EnvValue 'REDIS_URL' "redis://localhost:${redisPort}"
    Write-Ok "Set REDIS_URL to the local Docker Redis instance."
}

$currentAuthSecret = Get-EnvValue 'AUTH_SECRET'
if ([string]::IsNullOrEmpty($currentAuthSecret) -or $currentAuthSecret -like '*YOUR_MIN_32_CHAR*') {
    Set-EnvValue 'AUTH_SECRET' (New-RandomHex 32)
    Write-Ok "Generated a random AUTH_SECRET."
}

# ---------------------------------------------------------------------------
# 5. Install dependencies (needed before we can run `npx web-push`/prisma)
# ---------------------------------------------------------------------------
Write-Step "Installing npm dependencies (npm ci)"
npm ci
if ($LASTEXITCODE -ne 0) { Write-FailMsg "npm ci failed." }
Write-Ok "Dependencies installed."

# VAPID keys need the now-installed web-push package; generate only if unset.
$currentVapidPublic = Get-EnvValue 'VAPID_PUBLIC_KEY'
if ([string]::IsNullOrEmpty($currentVapidPublic) -or $currentVapidPublic -like '*YOUR_VAPID*') {
    Write-Step "Generating VAPID keys for web push notifications"
    $vapidJson = npx --yes web-push generate-vapid-keys --json 2>$null
    $vapid = $vapidJson | ConvertFrom-Json
    Set-EnvValue 'VAPID_PUBLIC_KEY' $vapid.publicKey
    Set-EnvValue 'VAPID_PRIVATE_KEY' $vapid.privateKey
    Write-Ok "Generated and saved VAPID keys."
}
if (-not (Get-EnvValue 'VAPID_SUBJECT')) {
    Set-EnvValue 'VAPID_SUBJECT' 'mailto:admin@localhost'
}

# ---------------------------------------------------------------------------
# 6. Start Postgres + Redis containers and wait for them to be healthy
# ---------------------------------------------------------------------------
if (-not $SkipInfra) {
    Write-Step "Starting Postgres (PostGIS) + Redis via Docker Compose"
    Invoke-Compose up -d postgres redis
    if ($LASTEXITCODE -ne 0) { Write-FailMsg "docker compose up failed." }

    Write-Step "Waiting for Postgres to become healthy"
    $attempts = 0
    while ($true) {
        Invoke-Compose exec -T postgres pg_isready -U $pgUser -d $pgDb 2>$null 1>$null
        if ($LASTEXITCODE -eq 0) { break }
        $attempts++
        if ($attempts -ge 30) { Write-FailMsg "Postgres did not become ready within 60s. Check 'docker compose logs postgres'." }
        Start-Sleep -Seconds 2
    }
    Write-Ok "Postgres is ready."

    Write-Step "Waiting for Redis to become healthy"
    $attempts = 0
    while ($true) {
        $pong = Invoke-Compose exec -T redis redis-cli ping 2>$null
        if ($pong -match 'PONG') { break }
        $attempts++
        if ($attempts -ge 30) { Write-FailMsg "Redis did not become ready within 60s. Check 'docker compose logs redis'." }
        Start-Sleep -Seconds 2
    }
    Write-Ok "Redis is ready."
}

# ---------------------------------------------------------------------------
# 7. Prisma: generate client, apply migrations, seed
# ---------------------------------------------------------------------------
Write-Step "Generating Prisma client"
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-FailMsg "prisma generate failed." }
Write-Ok "Prisma client generated."

Write-Step "Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-FailMsg "prisma migrate deploy failed." }
Write-Ok "Migrations applied."

if (-not $SkipSeed) {
    Write-Step "Seeding the database"
    npm run prisma:seed
    if ($LASTEXITCODE -ne 0) { Write-FailMsg "Seeding failed." }
    Write-Ok "Seed complete."
} else {
    Write-WarnMsg "Skipped seeding (-SkipSeed)."
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Ok "Setup complete."
Write-Host ""
Write-Host "Still need real values in .env before going live:"
Write-Host "  - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET (Razorpay Dashboard)"
Write-Host "  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI (Google Cloud Console), if using Google sign-in"
Write-Host "  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID (Google Cloud Console)"
Write-Host "  - NODE_ENV is currently '$(Get-EnvValue 'NODE_ENV')' — set to 'development' for local work, or 'production' once the above are filled in for a real deployment."
Write-Host ""
Write-Host "Next steps (Windows has no single-command dev:all/start:all — run in two terminals):"
Write-Host "  npm run dev      # Next.js dev server"
Write-Host "  npm run worker   # background worker (separate terminal)"
Write-Host ""
