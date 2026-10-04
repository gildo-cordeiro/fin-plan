#!/usr/bin/env bash
# Espelha .github/workflows/ci.yml. Uso:
#   validate.sh            valida apenas os apps alterados em relação a origin/main (+ working tree)
#   validate.sh web|api    força um app
#   validate.sh all        valida os dois
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

target="${1:-auto}"
run_web=false
run_api=false

case "$target" in
  web) run_web=true ;;
  api) run_api=true ;;
  all) run_web=true; run_api=true ;;
  auto)
    base="$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)"
    changed="$( { git diff --name-only "$base"; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u)"
    grep -q '^apps/web/' <<<"$changed" && run_web=true
    grep -q '^apps/api/' <<<"$changed" && run_api=true
    if ! $run_web && ! $run_api; then
      echo "Nenhuma alteração em apps/web ou apps/api. Use 'validate.sh all' para forçar."
      exit 0
    fi
    ;;
  *) echo "Argumento inválido: $target (use web|api|all)" >&2; exit 2 ;;
esac

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if $run_web; then
  step "web: lint"
  if ! (cd apps/web && npm run lint); then
    if [[ "${STRICT_LINT:-0}" == "1" ]]; then exit 1; fi
    printf '\033[1;33mAVISO: lint com problemas (não bloqueia; o CI não roda lint). Não introduza erros novos. Use STRICT_LINT=1 para bloquear.\033[0m\n'
  fi
  step "web: test"
  (cd apps/web && npm test)
  step "web: build"
  (cd apps/web && npm run build)
fi

if $run_api; then
  step "api: go vet"
  (cd apps/api && go vet ./...)
  step "api: go test"
  (cd apps/api && go test ./...)
  step "api: go build"
  (cd apps/api && go build -o /dev/null ./cmd/api)
fi

printf '\n\033[1;32mOK: validação concluída (web=%s, api=%s)\033[0m\n' "$run_web" "$run_api"
