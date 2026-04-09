#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Este script soporta actualmente Debian/Ubuntu con apt." >&2
  exit 1
fi

ARCH="$(dpkg --print-architecture)"
source /etc/os-release
KUBECTL_VERSION="${KUBECTL_VERSION:-$(curl -fsSL https://dl.k8s.io/release/stable.txt)}"
MINIKUBE_VERSION="${MINIKUBE_VERSION:-latest}"
ARGOCD_VERSION="${ARGOCD_VERSION:-latest}"

case "${ARCH}" in
  amd64)
    BIN_ARCH="amd64"
    ;;
  arm64)
    BIN_ARCH="arm64"
    ;;
  *)
    echo "Arquitectura no soportada por este script: ${ARCH}" >&2
    exit 1
    ;;
esac

log() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Falta el comando requerido: $1" >&2
    exit 1
  fi
}

install_base_packages() {
  log "Instalando dependencias base"
  $SUDO apt-get update
  $SUDO apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gpg \
    conntrack \
    socat
}

install_docker() {
  log "Instalando Docker Engine"
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  cat <<EOF | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable
EOF

  $SUDO apt-get update
  $SUDO apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

  $SUDO systemctl enable --now docker

  if [[ -n "${SUDO}" ]]; then
    $SUDO usermod -aG docker "${USER}" || true
  fi
}

install_kubectl() {
  log "Instalando kubectl (${KUBECTL_VERSION})"
  curl -fsSLo kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${BIN_ARCH}/kubectl"
  chmod +x kubectl
  $SUDO install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  rm -f kubectl
}

install_minikube() {
  log "Instalando minikube (${MINIKUBE_VERSION})"
  curl -fsSLo minikube "https://storage.googleapis.com/minikube/releases/${MINIKUBE_VERSION}/minikube-linux-${BIN_ARCH}"
  chmod +x minikube
  $SUDO install -o root -g root -m 0755 minikube /usr/local/bin/minikube
  rm -f minikube
}

install_argocd() {
  log "Instalando argocd (${ARGOCD_VERSION})"
  curl -fsSLo argocd "https://github.com/argoproj/argo-cd/releases/${ARGOCD_VERSION}/download/argocd-linux-${BIN_ARCH}"
  chmod +x argocd
  $SUDO install -o root -g root -m 0755 argocd /usr/local/bin/argocd
  rm -f argocd
}

main() {
  require_command curl

  install_base_packages
  require_command gpg
  require_command tar
  install_docker
  install_kubectl
  install_minikube
  install_argocd

  log "Instalacion completada"
  echo "Si acabas de anadir tu usuario al grupo docker, abre una nueva sesion o ejecuta: newgrp docker"
}

main "$@"
