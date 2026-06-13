#!/usr/bin/env bash
set -euo pipefail

echo "[fanvue-runpod] Booting Fanvue ComfyUI runtime"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_BUNDLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$DEFAULT_BUNDLE_DIR/scripts/resolve_runtime_paths.sh" ]; then
  # shellcheck disable=SC1091
  source "$DEFAULT_BUNDLE_DIR/scripts/resolve_runtime_paths.sh"
fi

WORKSPACE_DIR="$(resolve_workspace_dir)"
FANVUE_DIR="${FANVUE_DIR:-$WORKSPACE_DIR/fanvue}"
BUNDLE_DIR="${BUNDLE_DIR:-$FANVUE_DIR/bootstrap}"
REPO_URL="${FANVUE_BOOTSTRAP_REPO_URL:-${FANVUE_BOOTSTRAP_REPO:-}}"
REPO_REF="${FANVUE_BOOTSTRAP_REPO_REF:-${FANVUE_BOOTSTRAP_REF:-main}}"
COMFY_DIR="$(resolve_comfy_dir)"

export WORKSPACE_DIR FANVUE_DIR BUNDLE_DIR COMFY_DIR

mkdir -p "$FANVUE_DIR"

if [ -n "$REPO_URL" ]; then
  echo "[fanvue-runpod] Cloning bootstrap repo: $REPO_URL ($REPO_REF)"
  rm -rf "$BUNDLE_DIR"
  CLONE_URL="$REPO_URL"
  if [ -n "${GITHUB_TOKEN:-}" ] && [[ "$CLONE_URL" == https://github.com/* ]]; then
    CLONE_URL="https://x-access-token:${GITHUB_TOKEN}@${CLONE_URL#https://}"
  fi
  git clone --depth 1 --branch "$REPO_REF" "$CLONE_URL" "$BUNDLE_DIR"
else
  echo "[fanvue-runpod] FANVUE_BOOTSTRAP_REPO_URL is empty"
  echo "[fanvue-runpod] Using bundled runtime at: $DEFAULT_BUNDLE_DIR"
  BUNDLE_DIR="$DEFAULT_BUNDLE_DIR"
  export BUNDLE_DIR
fi

chmod +x "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

if [ "${FANVUE_START_COMFYUI_EARLY:-true}" = "true" ]; then
  echo "[fanvue-runpod] Running pre-model bootstrap before ComfyUI start"
  FANVUE_BOOTSTRAP_STAGE=pre_models "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

  echo "[fanvue-runpod] Starting ComfyUI before model download for observable readiness"
  "$BUNDLE_DIR/scripts/start_comfyui.sh" &
  COMFY_PID="$!"

  echo "[fanvue-runpod] Downloading models while ComfyUI is reachable"
  FANVUE_BOOTSTRAP_STAGE=models_only "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

  echo "[fanvue-runpod] Bootstrap complete; keeping ComfyUI process alive"
  wait "$COMFY_PID"
else
  "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"
  echo "[fanvue-runpod] Starting ComfyUI"
  exec "$BUNDLE_DIR/scripts/start_comfyui.sh"
fi
