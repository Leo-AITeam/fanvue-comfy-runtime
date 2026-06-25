#!/usr/bin/env bash
set -euo pipefail

echo "[fanvue-runpod] Booting Fanvue ComfyUI runtime"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_BUNDLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EARLY_WORKSPACE_DIR="${RUNPOD_VOLUME_PATH:-${WORKSPACE_DIR:-/workspace}}"
FANVUE_DIR="${FANVUE_DIR:-$EARLY_WORKSPACE_DIR/fanvue}"
LOG_FILE="$FANVUE_DIR/fanvue_runtime.log"

mkdir -p "$FANVUE_DIR"
touch "$LOG_FILE"
cat > "$FANVUE_DIR/runtime_boot_report.json" <<JSON
{
  "ok": true,
  "status": "booting",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "fanvue_dir": "$FANVUE_DIR",
  "log_file": "$LOG_FILE"
}
JSON

if [ "${FANVUE_DIAGNOSTIC_HTTP:-true}" = "true" ]; then
  python3 -m http.server "${FANVUE_DIAGNOSTIC_PORT:-8888}" --directory "$FANVUE_DIR" &
fi

exec >> "$LOG_FILE" 2>&1
echo "[fanvue-runpod] Runtime log: $LOG_FILE"
echo "[fanvue-runpod] Diagnostic HTTP server requested on port ${FANVUE_DIAGNOSTIC_PORT:-8888}"

if [ -f "$DEFAULT_BUNDLE_DIR/scripts/resolve_runtime_paths.sh" ]; then
  # shellcheck disable=SC1091
  source "$DEFAULT_BUNDLE_DIR/scripts/resolve_runtime_paths.sh"
fi

WORKSPACE_DIR="$(resolve_workspace_dir)"
BUNDLE_DIR="${BUNDLE_DIR:-$FANVUE_DIR/bootstrap}"
REPO_URL="${FANVUE_BOOTSTRAP_REPO_URL:-${FANVUE_BOOTSTRAP_REPO:-}}"
REPO_REF="${FANVUE_BOOTSTRAP_REPO_REF:-${FANVUE_BOOTSTRAP_REF:-main}}"
if ! COMFY_DIR="$(resolve_comfy_dir)"; then
  COMFY_DIR="${COMFY_DIR:-$WORKSPACE_DIR/ComfyUI}"
fi

export WORKSPACE_DIR FANVUE_DIR BUNDLE_DIR COMFY_DIR

if [ -n "$REPO_URL" ]; then
  echo "[fanvue-runpod] Cloning bootstrap repo: $REPO_URL ($REPO_REF)"
  cat > "$FANVUE_DIR/runtime_boot_report.json" <<JSON
{
  "ok": true,
  "status": "cloning_bootstrap_repo",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "repo_ref": "$REPO_REF",
  "bundle_dir": "$BUNDLE_DIR"
}
JSON
  if [ "$BUNDLE_DIR" = "$DEFAULT_BUNDLE_DIR" ]; then
    BUNDLE_DIR="$FANVUE_DIR/bootstrap"
    export BUNDLE_DIR
  fi
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
cat > "$FANVUE_DIR/runtime_boot_report.json" <<JSON
{
  "ok": true,
  "status": "bootstrap_repo_ready",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "bundle_dir": "$BUNDLE_DIR",
  "comfy_dir": "$COMFY_DIR"
}
JSON

if [ "${FANVUE_START_COMFYUI_EARLY:-false}" = "true" ]; then
  echo "[fanvue-runpod] Running pre-model bootstrap before ComfyUI start"
  FANVUE_BOOTSTRAP_STAGE=pre_models "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

  echo "[fanvue-runpod] Starting ComfyUI before model download for observable readiness"
  "$BUNDLE_DIR/scripts/start_comfyui.sh" &
  COMFY_PID="$!"

  echo "[fanvue-runpod] Downloading models while ComfyUI is reachable"
  FANVUE_BOOTSTRAP_STAGE=models_only "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"

  if [ "${FANVUE_AUTO_RUN_PROMPT:-false}" = "true" ]; then
    echo "[fanvue-runpod] Starting runtime worker"
    FANVUE_WORKER_REPORT="$FANVUE_DIR/fanvue_worker_report.json" \
    FANVUE_WORKER_REPORT_MIRROR="$COMFY_DIR/output/fanvue_worker_report.json" \
    node "$BUNDLE_DIR/scripts/comfy_runtime_worker.mjs" &
  fi

  echo "[fanvue-runpod] Bootstrap complete; keeping ComfyUI process alive"
  wait "$COMFY_PID"
else
  "$BUNDLE_DIR/bootstrap_fanvue_comfyui.sh"
  echo "[fanvue-runpod] Starting ComfyUI"
  "$BUNDLE_DIR/scripts/start_comfyui.sh" &
  COMFY_PID="$!"

  if [ "${FANVUE_AUTO_RUN_PROMPT:-false}" = "true" ]; then
    echo "[fanvue-runpod] Starting runtime worker"
    FANVUE_WORKER_REPORT="$FANVUE_DIR/fanvue_worker_report.json" \
    FANVUE_WORKER_REPORT_MIRROR="$COMFY_DIR/output/fanvue_worker_report.json" \
    node "$BUNDLE_DIR/scripts/comfy_runtime_worker.mjs" &
  fi

  echo "[fanvue-runpod] Bootstrap complete; keeping ComfyUI process alive"
  wait "$COMFY_PID"
fi
