#!/usr/bin/env bash

set -euo pipefail

FAILED=0

check_command() {
  local name="$1"
  local version_cmd="$2"

  if command -v "$name" >/dev/null 2>&1; then
    printf '[OK] %s -> %s\n' "$name" "$(command -v "$name")"
    bash -lc "$version_cmd" || true
  else
    printf '[ERROR] %s no esta disponible en PATH\n' "$name" >&2
    FAILED=1
  fi

  echo
}

check_command "docker" "docker --version"
check_command "kubectl" "kubectl version --client --output=yaml | sed -n '1,8p'"
check_command "minikube" "minikube version"
check_command "argocd" "argocd version --client"

if [[ "${FAILED}" -ne 0 ]]; then
  echo "Faltan herramientas por instalar o exponer en PATH." >&2
  exit 1
fi

echo "Todas las herramientas principales estan disponibles."
