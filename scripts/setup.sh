#!/usr/bin/env bash
#
# Get Apna Driver — one-command environment setup (Linux & macOS)
# =================================================================
# Installs/verifies Node.js and Docker, provisions PostgreSQL (PostGIS) +
# Redis via the project's own docker-compose.yml, generates a safe local
# .env from .env.example (filling in only what's needed to boot — never
# touching a value you've already customized), installs dependencies, and
# runs prisma generate -> migrate deploy -> seed.
#
# Usage:
#   ./scripts/setup.sh [options]
#
# Options:
#   -y, --yes          Non-interactive: assume "yes" to every prompt
#                       (required installs proceed without asking).
#       --skip-infra    Don't touch Docker/Postgres/Redis containers — use
#                       this when DATABASE_URL/REDIS_URL already point at a
#                       managed/remote database (RDS, Supabase, Upstash...).
#       --skip-seed     Run migrations but skip prisma/seed.ts. Recommended
#                       for a real production database — the seed creates
#                       demo admin/customer/driver accounts meant for local
#                       development only.
#   -h, --help          Show this help text.
#
# Safe to re-run: every step checks current state first and skips what's
# already done.
set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
ASSUME_YES=false
SKIP_INFRA=false
SKIP_SEED=false

for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=true ;;
    --skip-infra) SKIP_INFRA=true ;;
    --skip-seed) SKIP_SEED=true ;;
    -h|--help)
      sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (see --help)" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET='\033[0m'; C_BOLD='\033[1m'; C_GREEN='\033[32m'; C_YELLOW='\033[33m'; C_RED='\033[31m'; C_BLUE='\033[34m'
else
  C_RESET=''; C_BOLD=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_BLUE=''
fi

log()   { printf "%b==>%b %s\n" "$C_BLUE$C_BOLD" "$C_RESET" "$1"; }
ok()    { printf "%b  ✓%b %s\n" "$C_GREEN" "$C_RESET" "$1"; }
warn()  { printf "%b  !%b %s\n" "$C_YELLOW$C_BOLD" "$C_RESET" "$1"; }
fail()  { printf "%b  ✗%b %s\n" "$C_RED$C_BOLD" "$C_RESET" "$1" >&2; exit 1; }

confirm() {
  # confirm "question" — returns 0 (proceed) if ASSUME_YES or the user types y/Y.
  if [ "$ASSUME_YES" = true ]; then
    return 0
  fi
  local reply
  read -r -p "$(printf "%b  ?%b %s [y/N] " "$C_YELLOW$C_BOLD" "$C_RESET" "$1")" reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

require_cmd_or_fail() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' is still not available after setup. Install it manually and re-run this script."
}

# ---------------------------------------------------------------------------
# Resolve repo root regardless of where this script is invoked from
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

[ -f "package.json" ] || fail "Could not find package.json in $REPO_ROOT — is this script still inside the project's scripts/ directory?"

REQUIRED_NODE_MAJOR=22

log "Get Apna Driver — environment setup"
echo "    Repo root: $REPO_ROOT"
[ "$SKIP_INFRA" = true ] && echo "    Mode: --skip-infra (assuming an external/managed database)"
[ "$SKIP_SEED" = true ] && echo "    Mode: --skip-seed (migrations only, no demo data)"
echo

# ---------------------------------------------------------------------------
# 1. Detect OS / package manager
# ---------------------------------------------------------------------------
OS_KIND="unknown"
PKG_MANAGER=""
case "$(uname -s)" in
  Linux*)
    OS_KIND="linux"
    if command -v apt-get >/dev/null 2>&1; then PKG_MANAGER="apt"
    elif command -v dnf >/dev/null 2>&1; then PKG_MANAGER="dnf"
    elif command -v yum >/dev/null 2>&1; then PKG_MANAGER="yum"
    elif command -v pacman >/dev/null 2>&1; then PKG_MANAGER="pacman"
    elif command -v apk >/dev/null 2>&1; then PKG_MANAGER="apk"
    fi
    ;;
  Darwin*)
    OS_KIND="macos"
    command -v brew >/dev/null 2>&1 && PKG_MANAGER="brew"
    ;;
  *)
    fail "Unsupported OS: $(uname -s). This script supports Linux and macOS — on Windows, run scripts\\setup.ps1 instead."
    ;;
esac
ok "Detected OS: $OS_KIND${PKG_MANAGER:+ (package manager: $PKG_MANAGER)}"

# ---------------------------------------------------------------------------
# 2. Node.js — verify version, install via nvm if missing/too old
# ---------------------------------------------------------------------------
log "Checking Node.js (need >= v$REQUIRED_NODE_MAJOR)"

node_major_version() {
  command -v node >/dev/null 2>&1 || { echo 0; return; }
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0
}

CURRENT_NODE_MAJOR="$(node_major_version)"

if [ "$CURRENT_NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ] 2>/dev/null; then
  ok "Node.js $(node -v) already satisfies the requirement."
else
  if [ "$CURRENT_NODE_MAJOR" -eq 0 ]; then
    warn "Node.js was not found."
  else
    warn "Found Node.js major version $CURRENT_NODE_MAJOR — this project needs >= $REQUIRED_NODE_MAJOR."
  fi

  if confirm "Install Node.js $REQUIRED_NODE_MAJOR LTS via nvm (user-space, no sudo, doesn't touch any existing system Node)?"; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      log "Installing nvm..."
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi
    # shellcheck disable=SC1091
    \. "$NVM_DIR/nvm.sh"
    nvm install "$REQUIRED_NODE_MAJOR"
    nvm alias default "$REQUIRED_NODE_MAJOR"
    hash -r
    ok "Installed Node.js $(node -v) via nvm."
    warn "Add this to your shell profile so new terminals pick up nvm automatically:"
    echo "      export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\""
  else
    fail "Node.js >= $REQUIRED_NODE_MAJOR is required. Install it (e.g. https://nodejs.org, nvm, or your package manager) and re-run this script."
  fi
fi
require_cmd_or_fail npm

# ---------------------------------------------------------------------------
# 3. Docker + Compose plugin (skipped entirely with --skip-infra)
# ---------------------------------------------------------------------------
DOCKER_COMPOSE_CMD=""

if [ "$SKIP_INFRA" = true ]; then
  warn "Skipping Docker/Postgres/Redis setup (--skip-infra) — make sure DATABASE_URL and REDIS_URL in .env already point at a reachable database."
else
  log "Checking Docker"

  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker was not found."
    if confirm "Install Docker now? (This runs the official get.docker.com script via sudo on Linux, or 'brew install --cask docker' on macOS.)"; then
      case "$OS_KIND" in
        linux)
          curl -fsSL https://get.docker.com | sudo sh
          if command -v usermod >/dev/null 2>&1; then
            sudo usermod -aG docker "$USER" || true
            warn "Added $USER to the 'docker' group — log out and back in (or run 'newgrp docker') for this to take effect without sudo."
          fi
          ;;
        macos)
          if [ "$PKG_MANAGER" = "brew" ]; then
            brew install --cask docker
            warn "Docker Desktop was installed but needs to be launched once manually (Spotlight -> Docker) to finish its one-time setup."
          else
            fail "Homebrew not found. Install Docker Desktop manually from https://www.docker.com/products/docker-desktop/ and re-run this script."
          fi
          ;;
      esac
    else
      fail "Docker is required to provision Postgres/Redis locally. Install it, or re-run with --skip-infra if you're using a managed database."
    fi
  fi
  require_cmd_or_fail docker

  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
    warn "Using legacy 'docker-compose' binary — consider upgrading to the 'docker compose' plugin."
  else
    fail "Docker is installed but no Compose (v2 plugin or legacy binary) was found. Install the Docker Compose plugin and re-run."
  fi
  ok "Docker ready ($($DOCKER_COMPOSE_CMD version --short 2>/dev/null || echo "compose available"))."

  if ! docker info >/dev/null 2>&1; then
    fail "Docker is installed but the daemon isn't reachable (is Docker Desktop/the docker service running? On Linux: 'sudo systemctl start docker'). Start it and re-run this script."
  fi
fi

# ---------------------------------------------------------------------------
# 4. .env — create from .env.example, fill in only what's needed to boot
# ---------------------------------------------------------------------------
log "Preparing .env"

if [ ! -f ".env" ]; then
  [ -f ".env.example" ] || fail ".env.example is missing — cannot generate a starting .env. Restore it from version control."
  cp .env.example .env
  ok "Created .env from .env.example."
else
  ok ".env already exists — only filling in missing pieces, never overwriting values you've set."
fi

env_get() { grep -E "^$1=" .env 2>/dev/null | head -n1 | cut -d'=' -f2- || true; }
env_set() {
  # env_set KEY VALUE — replaces an existing KEY=... line, or appends one.
  local key="$1" value="$2"
  if grep -qE "^$key=" .env; then
    local tmp; tmp="$(mktemp)"
    awk -F'=' -v k="$key" -v v="$value" 'BEGIN{OFS="="} $1==k {$0=k"="v} {print}' .env > "$tmp"
    mv "$tmp" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}
node_random_hex() { node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }

# Docker-compose needs these component variables; .env.example only ships
# the combined DATABASE_URL/REDIS_URL, so generate sane local defaults for
# whichever of these are still missing.
[ -z "$(env_get POSTGRES_USER)" ] && env_set POSTGRES_USER "gad_app"
[ -z "$(env_get POSTGRES_DB)" ] && env_set POSTGRES_DB "get_apna_driver"
[ -z "$(env_get POSTGRES_PORT)" ] && env_set POSTGRES_PORT "5432"
[ -z "$(env_get REDIS_PORT)" ] && env_set REDIS_PORT "6379"
if [ -z "$(env_get POSTGRES_PASSWORD)" ]; then
  env_set POSTGRES_PASSWORD "$(node_random_hex 24)"
  ok "Generated a random POSTGRES_PASSWORD."
fi

PG_USER="$(env_get POSTGRES_USER)"
PG_PASSWORD="$(env_get POSTGRES_PASSWORD)"
PG_DB="$(env_get POSTGRES_DB)"
PG_PORT="$(env_get POSTGRES_PORT)"
REDIS_PORT_VALUE="$(env_get REDIS_PORT)"

CURRENT_DATABASE_URL="$(env_get DATABASE_URL)"
if [[ "$CURRENT_DATABASE_URL" == *"DB_USER:DB_PASSWORD@DB_HOST"* || -z "$CURRENT_DATABASE_URL" ]]; then
  env_set DATABASE_URL "postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}"
  ok "Set DATABASE_URL to the local Docker Postgres instance."
fi

CURRENT_REDIS_URL="$(env_get REDIS_URL)"
if [[ "$CURRENT_REDIS_URL" == *"redis-host"* || -z "$CURRENT_REDIS_URL" ]]; then
  env_set REDIS_URL "redis://localhost:${REDIS_PORT_VALUE}"
  ok "Set REDIS_URL to the local Docker Redis instance."
fi

CURRENT_AUTH_SECRET="$(env_get AUTH_SECRET)"
if [[ "$CURRENT_AUTH_SECRET" == *"YOUR_MIN_32_CHAR"* || -z "$CURRENT_AUTH_SECRET" ]]; then
  env_set AUTH_SECRET "$(node_random_hex 32)"
  ok "Generated a random AUTH_SECRET."
fi

# ---------------------------------------------------------------------------
# 5. Install dependencies (needed before we can run `npx web-push`/prisma)
# ---------------------------------------------------------------------------
log "Installing npm dependencies (npm ci)"
npm ci
ok "Dependencies installed."

# VAPID keys need the now-installed web-push package; generate only if unset.
CURRENT_VAPID_PUBLIC="$(env_get VAPID_PUBLIC_KEY)"
CURRENT_VAPID_PRIVATE="$(env_get VAPID_PRIVATE_KEY)"
if [[ -z "$CURRENT_VAPID_PUBLIC" || "$CURRENT_VAPID_PUBLIC" == *"YOUR_VAPID"* ]]; then
  log "Generating VAPID keys for web push notifications"
  VAPID_JSON="$(npx --yes web-push generate-vapid-keys --json 2>/dev/null)"
  VAPID_PUBLIC="$(node -e "console.log(JSON.parse(process.argv[1]).publicKey)" "$VAPID_JSON")"
  VAPID_PRIVATE="$(node -e "console.log(JSON.parse(process.argv[1]).privateKey)" "$VAPID_JSON")"
  env_set VAPID_PUBLIC_KEY "$VAPID_PUBLIC"
  env_set VAPID_PRIVATE_KEY "$VAPID_PRIVATE"
  ok "Generated and saved VAPID keys."
fi
if [ -z "$(env_get VAPID_SUBJECT)" ]; then
  env_set VAPID_SUBJECT "mailto:admin@localhost"
fi

# ---------------------------------------------------------------------------
# 6. Start Postgres + Redis containers and wait for them to be healthy
# ---------------------------------------------------------------------------
if [ "$SKIP_INFRA" = false ]; then
  log "Starting Postgres (PostGIS) + Redis via Docker Compose"
  $DOCKER_COMPOSE_CMD up -d postgres redis

  log "Waiting for Postgres to become healthy"
  ATTEMPTS=0
  until $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge 30 ]; then
      fail "Postgres did not become ready within 60s. Check 'docker compose logs postgres'."
    fi
    sleep 2
  done
  ok "Postgres is ready."

  log "Waiting for Redis to become healthy"
  ATTEMPTS=0
  until $DOCKER_COMPOSE_CMD exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge 30 ]; then
      fail "Redis did not become ready within 60s. Check 'docker compose logs redis'."
    fi
    sleep 2
  done
  ok "Redis is ready."
fi

# ---------------------------------------------------------------------------
# 7. Prisma: generate client, apply migrations, seed
# ---------------------------------------------------------------------------
log "Generating Prisma client"
npx prisma generate
ok "Prisma client generated."

log "Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy
ok "Migrations applied."

if [ "$SKIP_SEED" = false ]; then
  log "Seeding the database"
  npm run prisma:seed
  ok "Seed complete."
else
  warn "Skipped seeding (--skip-seed)."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo
ok "Setup complete."
echo
echo "Still need real values in .env before going live:"
echo "  - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET (Razorpay Dashboard)"
echo "  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI (Google Cloud Console), if using Google sign-in"
echo "  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID (Google Cloud Console)"
echo "  - NODE_ENV is currently '$(env_get NODE_ENV)' — set to 'development' for local work, or 'production' once the above are filled in for a real deployment."
echo
echo "Next steps:"
echo "  npm run dev:all     # Next.js dev server + background worker"
echo "  npm run build && npm run start:all   # production build"
echo
