#!/usr/bin/env bash
set -euo pipefail

echo "[fanvue-runpod] Booting Fanvue ComfyUI runtime"

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
FANVUE_DIR="${FANVUE_DIR:-$WORKSPACE_DIR/fanvue}"
BUNDLE_DIR="${BUNDLE_DIR:-$FANVUE_DIR/bootstrap}"
REPO_URL="${FANVUE_BOOTSTRAP_REPO_URL:-${FANVUE_BOOTSTRAP_REPO:-}}"
REPO_REF="${FANVUE_BOOTSTRAP_REPO_REF:-${FANVUE_BOOTSTRAP_REF:-main}}"

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
  echo "[fanvue-runpod] Assuming bundle already exists at: $BUNDLE_DIR"
fi

chmod +x "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"
"$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

echo "[fanvue-runpod] Starting ComfyUI"
exec "$BUNDLE_DIR/scripts/start_comfyui.sh"
