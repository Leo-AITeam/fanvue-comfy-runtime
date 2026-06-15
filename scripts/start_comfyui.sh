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

disable_baked_node() {
  local node_name="$1"
  local source="$COMFY_DIR/custom_nodes/$node_name"
  local target="$COMFY_DIR/custom_nodes/${node_name}.disabled"

  if [ -d "$target" ]; then
    echo "[fanvue-start] Custom node already disabled: $node_name"
    return 0
  fi
  if [ ! -d "$source" ]; then
    echo "[fanvue-start] Custom node not present, skip disable: $node_name"
    return 0
  fi

  mv "$source" "$target"
  echo "[fanvue-start] Disabled custom node for this run: $node_name"
}

if [ "${FANVUE_DISABLE_REACTOR:-auto}" = "true" ] ||
  { [ "${FANVUE_DISABLE_REACTOR:-auto}" = "auto" ] && [ "${FANVUE_TEST_PROFILE:-smoke}" = "face_detailer_smoke" ]; }; then
  disable_baked_node "ComfyUI-ReActor"
fi

cd "$COMFY_DIR"
exec python3 main.py --listen 0.0.0.0 --port "$COMFYUI_PORT"
