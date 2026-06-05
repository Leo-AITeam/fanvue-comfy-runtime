#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
COMFY_DIR="${COMFY_DIR:-$WORKSPACE_DIR/ComfyUI}"
COMFYUI_PORT="${COMFYUI_PORT:-8188}"

cd "$COMFY_DIR"
exec python3 main.py --listen 0.0.0.0 --port "$COMFYUI_PORT"
