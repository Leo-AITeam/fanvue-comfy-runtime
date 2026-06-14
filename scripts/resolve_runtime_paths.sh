#!/usr/bin/env bash
set -euo pipefail

resolve_comfy_dir() {
  if [ -n "${COMFY_DIR:-}" ] && [ -d "$COMFY_DIR" ]; then
    printf '%s\n' "$COMFY_DIR"
    return 0
  fi

  for candidate in \
    "${WORKSPACE_DIR:-/workspace}/ComfyUI" \
    /workspace/ComfyUI \
    /runpod-slim/ComfyUI \
    /ComfyUI \
    /opt/ComfyUI \
    /opt/comfyui-baked/ComfyUI \
    /opt/comfyui-baked; do
    if [ -d "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

resolve_workspace_dir() {
  if [ -n "${WORKSPACE_DIR:-}" ] && [ -d "$WORKSPACE_DIR" ]; then
    printf '%s\n' "$WORKSPACE_DIR"
    return 0
  fi

  if [ -d /workspace ]; then
    printf '%s\n' /workspace
    return 0
  fi

  if [ -d /runpod-slim ]; then
    printf '%s\n' /runpod-slim
    return 0
  fi

  printf '%s\n' /workspace
}
