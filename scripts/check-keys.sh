#!/usr/bin/env bash
# Checks each key in .env.local against its service. Prints OK/FAIL only, never the keys.
set -uo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env.local"
[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE yet. Run: bash scripts/setup-keys.sh"; exit 1; }

get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d "[:space:]\"'" || true; }
COMPOSIO_API_KEY="$(get COMPOSIO_API_KEY)"
OPENROUTER_API_KEY="$(get OPENROUTER_API_KEY)"
TAVILY_API_KEY="$(get TAVILY_API_KEY)"

fails=0
report() { # name status note
  if [ "$2" = "200" ]; then echo "  OK    $1 ${3:-}"; else echo "  FAIL  $1 (HTTP $2) ${3:-}"; fails=$((fails + 1)); fi
}

# Headers are passed on stdin so keys don't show up in the process list.
call() { # header url [extra curl args...]
  local header="$1" url="$2"; shift 2
  printf '%s\n' "$header" | curl -sS -o /tmp/oln-check.$$ -w '%{http_code}' -H @- "$@" "$url" 2>/dev/null || echo 000
}

echo "Checking keys from $ENV_FILE:"

if [ -z "$COMPOSIO_API_KEY" ]; then echo "  EMPTY COMPOSIO_API_KEY"; fails=$((fails + 1)); else
  code="$(call "x-api-key: $COMPOSIO_API_KEY" https://backend.composio.dev/api/v3.1/toolkits/gmail)"
  report COMPOSIO_API_KEY "$code" "(GET /toolkits/gmail)"
fi

if [ -z "$OPENROUTER_API_KEY" ]; then echo "  EMPTY OPENROUTER_API_KEY"; fails=$((fails + 1)); else
  code="$(call "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/key)"
  note=""
  if [ "$code" = "200" ]; then
    note="$(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).data||{};
      console.log(`(free tier: ${d.is_free_tier}, usage: ${d.usage}, limit: ${d.limit})`)' /tmp/oln-check.$$ 2>/dev/null)"
  fi
  report OPENROUTER_API_KEY "$code" "$note"
fi

if [ -z "$TAVILY_API_KEY" ]; then echo "  EMPTY TAVILY_API_KEY"; fails=$((fails + 1)); else
  # /usage costs no credits; fall back to a 1-credit search if it isn't available.
  code="$(call "Authorization: Bearer $TAVILY_API_KEY" https://api.tavily.com/usage)"
  if [ "$code" = "404" ] || [ "$code" = "405" ]; then
    code="$(call "Authorization: Bearer $TAVILY_API_KEY" https://api.tavily.com/search \
      -H 'Content-Type: application/json' -d '{"query":"composio","max_results":1}')"
  fi
  report TAVILY_API_KEY "$code"
fi

rm -f /tmp/oln-check.$$
echo
if [ "$fails" -eq 0 ]; then echo "All keys work."; else echo "$fails key(s) need fixing. Re-run: bash scripts/setup-keys.sh"; fi
exit "$fails"
