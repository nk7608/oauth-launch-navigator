#!/usr/bin/env bash
# Asks for each API key with hidden input and writes .env.local (permissions 600).
# Press Enter at a prompt to keep the value already saved. Keys are never printed.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env.local"

# Read an existing value from .env.local without sourcing it.
current() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true
}

ask_secret() {
  local name="$1" hint="$2" existing value
  existing="$(current "$name")"
  echo
  echo "$name  ($hint)"
  if [ -n "$existing" ]; then
    echo "  Already saved (${#existing} characters). Press Enter to keep it, or paste a new one."
  fi
  printf "  Paste key (input is hidden), then press Enter: "
  IFS= read -rs value
  echo
  # Strip whitespace, quotes and a pasted "NAME=" prefix.
  value="$(printf '%s' "$value" | tr -d '[:space:]"'"'")"
  value="${value#"$name"=}"
  if [ -z "$value" ]; then
    value="$existing"
    [ -n "$value" ] && echo "  Kept existing value." || echo "  Skipped (still empty)."
  else
    echo "  Saved (${#value} characters, ends in ...${value: -4})."
  fi
  printf -v "$name" '%s' "$value"
}

echo "Scopewise: API key setup"
echo "Keys go into $(pwd)/$ENV_FILE only. Nothing is shown on screen."

ask_secret COMPOSIO_API_KEY   "platform.composio.dev -> Settings -> API Keys"
ask_secret OPENROUTER_API_KEY "openrouter.ai/keys, starts with sk-or-"
ask_secret TAVILY_API_KEY     "app.tavily.com, starts with tvly-"

LLM_MODEL="$(current LLM_MODEL)"
LLM_PROVIDER="$(current LLM_PROVIDER)"
LLM_PROVIDER="${LLM_PROVIDER:-openrouter}"

umask 077
tmp="$(mktemp "$ENV_FILE.XXXXXX")"
cat > "$tmp" <<EOF
# Written by scripts/setup-keys.sh. Never commit this file. Never paste keys into a chat.
COMPOSIO_API_KEY=$COMPOSIO_API_KEY
OPENROUTER_API_KEY=$OPENROUTER_API_KEY
TAVILY_API_KEY=$TAVILY_API_KEY
# Optional: an OpenRouter model id ending in :free (chosen in build step 0d)
LLM_MODEL=$LLM_MODEL
LLM_PROVIDER=$LLM_PROVIDER
EOF
mv "$tmp" "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo
echo "Wrote $ENV_FILE. Checking the keys now..."
echo
bash scripts/check-keys.sh
