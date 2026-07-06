#!/usr/bin/env bash
set -euo pipefail

ROOT="${ANNA_LORA_ROOT:-/workspace/anna_lora}"
ARCHIVE="${1:-/workspace/anna_x_model_flux_v1_2026-07-07_FULL_WITH_DATASET.tar.gz}"
RUN_NAME="anna_x_model_flux_v1_2026-07-07"
RUN_DIR="$ROOT/training_runs/flux_v1"

mkdir -p "$ROOT" "$ROOT/datasets" "$ROOT/training_runs"

echo "[anna-flux-v1] unpacking $ARCHIVE"
tar -xzf "$ARCHIVE" -C "$ROOT"

echo "[anna-flux-v1] arranging dataset and training packet"
rm -rf "$ROOT/datasets/anna_x_model"
mv "$ROOT/$RUN_NAME/dataset/anna_x_model" "$ROOT/datasets/anna_x_model"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"
mv "$ROOT/$RUN_NAME/training_packet" "$RUN_DIR/config"
mkdir -p "$ROOT/style_loras"
if [ -d "$ROOT/$RUN_NAME/extras/civitai_loras/xlabs_flux_realism_lora" ]; then
  rm -rf "$ROOT/style_loras/xlabs_flux_realism_lora"
  mv "$ROOT/$RUN_NAME/extras/civitai_loras/xlabs_flux_realism_lora" "$ROOT/style_loras/xlabs_flux_realism_lora"
  echo "[anna-flux-v1] installed style LoRA: $ROOT/style_loras/xlabs_flux_realism_lora/flux_realism_lora.safetensors"
fi

echo "[anna-flux-v1] installing ai-toolkit"
if [ ! -d "$ROOT/ai-toolkit/.git" ]; then
  git clone --depth 1 https://github.com/ostris/ai-toolkit.git "$ROOT/ai-toolkit"
fi
cd "$ROOT/ai-toolkit"
git submodule update --init --recursive

python3 -m pip install --upgrade pip
python3 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
python3 -m pip install -r requirements.txt
python3 -m pip install bitsandbytes tensorboard huggingface_hub

if [ -z "${HF_TOKEN:-}" ]; then
  echo "[anna-flux-v1] HF_TOKEN is required for black-forest-labs/FLUX.1-dev"
  exit 42
fi

echo "[anna-flux-v1] starting training"
ANNA_LORA_ROOT="$ROOT" AI_TOOLKIT_DIR="$ROOT/ai-toolkit" bash "$RUN_DIR/config/train_anna_flux_v1.sh"
