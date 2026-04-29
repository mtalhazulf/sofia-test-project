#!/usr/bin/env bash
# One-shot local setup. Idempotent: safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "──────────────────────────────────────────────────"
echo "  AW Client Report Portal — local setup"
echo "──────────────────────────────────────────────────"

# 1. .env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -base64 32)
    # Replace the placeholder line with a real secret. Works on macOS + Linux.
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env
    else
      sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env
    fi
    echo "✓ Generated AUTH_SECRET in .env"
  else
    echo "⚠ openssl not found — please edit .env and set AUTH_SECRET manually"
  fi
else
  echo "✓ .env already exists (left untouched)"
fi

# 2. Prisma migrate + generate
echo "→ Running prisma migrate deploy…"
pnpm prisma migrate deploy
echo "→ Generating Prisma client…"
pnpm prisma generate

# 3. Seed (idempotent — sample client insert is gated)
echo "→ Seeding database…"
pnpm db:seed

# 4. Puppeteer Chromium
if [ ! -d "$HOME/.cache/puppeteer/chrome" ]; then
  echo "→ Installing Puppeteer Chromium (one-time, ~150 MB)…"
  npx -y puppeteer browsers install chrome
else
  echo "✓ Puppeteer Chromium already installed"
fi

cat <<EOF

──────────────────────────────────────────────────
  Setup complete.

  Run the dev server:
    pnpm dev          → http://localhost:3000

  Sign in:
    admin@example.com
    admin1234

  Run tests:
    pnpm test

  Build for production:
    pnpm build && pnpm start
──────────────────────────────────────────────────
EOF
