#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/resolve_runtime_paths.sh"

WORKSPACE_DIR="$(resolve_workspace_dir)"
if ! COMFY_DIR="$(resolve_comfy_dir)"; then
  COMFY_DIR="${COMFY_DIR:-$WORKSPACE_DIR/ComfyUI}"
fi
COMFYUI_PORT="${COMFYUI_PORT:-8188}"

if [ ! -f "$COMFY_DIR/main.py" ]; then
  echo "[fanvue-start] ComfyUI main.py not found in $COMFY_DIR"
  exit 50
fi

cd "$COMFY_DIR"
exec python3 main.py --listen 0.0.0.0 --port "$COMFYUI_PORT"
