#!/usr/bin/env bash
set -euo pipefail

echo "[fanvue-bootstrap] Starting ephemeral ComfyUI bootstrap"

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
FANVUE_DIR="${FANVUE_DIR:-$WORKSPACE_DIR/fanvue}"
COMFY_DIR="${COMFY_DIR:-$WORKSPACE_DIR/ComfyUI}"
BUNDLE_DIR="${BUNDLE_DIR:-$FANVUE_DIR/bootstrap}"
OUTPUT_DIR="${OUTPUT_DIR:-$FANVUE_DIR/output}"
INPUT_DIR="${INPUT_DIR:-$FANVUE_DIR/input}"
FANVUE_PREFLIGHT_MODE="${FANVUE_PREFLIGHT_MODE:-real}"
FANVUE_FIRST_TEST_ONLY="${FANVUE_FIRST_TEST_ONLY:-true}"

mkdir -p "$FANVUE_DIR" "$OUTPUT_DIR" "$INPUT_DIR"

if [ ! -d "$COMFY_DIR" ]; then
  echo "[fanvue-bootstrap] ComfyUI directory not found: $COMFY_DIR"
  echo "[fanvue-bootstrap] The base image must include ComfyUI or clone it before running this script."
  exit 20
fi

if [ ! -f "$BUNDLE_DIR/manifest.json" ]; then
  echo "[fanvue-bootstrap] manifest.json not found in $BUNDLE_DIR"
  exit 21
fi

echo "[fanvue-bootstrap] Running preflight"
BUNDLE_DIR="$BUNDLE_DIR" \
FANVUE_PREFLIGHT_MODE="$FANVUE_PREFLIGHT_MODE" \
FANVUE_FIRST_TEST_ONLY="$FANVUE_FIRST_TEST_ONLY" \
node "$BUNDLE_DIR/scripts/preflight.mjs"

echo "[fanvue-bootstrap] Installing custom nodes"
BUNDLE_DIR="$BUNDLE_DIR" \
COMFY_DIR="$COMFY_DIR" \
FANVUE_FIRST_TEST_ONLY="$FANVUE_FIRST_TEST_ONLY" \
node "$BUNDLE_DIR/scripts/install_custom_nodes.mjs"

echo "[fanvue-bootstrap] Downloading models"
BUNDLE_DIR="$BUNDLE_DIR" \
WORKSPACE_DIR="$WORKSPACE_DIR" \
FANVUE_FIRST_TEST_ONLY="$FANVUE_FIRST_TEST_ONLY" \
node "$BUNDLE_DIR/scripts/download_models.mjs"

mkdir -p "$COMFY_DIR/user/default/workflows"
cp -R "$BUNDLE_DIR/workflows/." "$COMFY_DIR/user/default/workflows/"

echo "[fanvue-bootstrap] Workflows installed"
echo "[fanvue-bootstrap] Ready for ComfyUI start on port ${COMFYUI_PORT:-8188}"
