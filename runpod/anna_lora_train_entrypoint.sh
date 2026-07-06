#!/usr/bin/env bash
set -euo pipefail

RUN_NAME="${ANNA_LORA_RUN_NAME:-anna_x_model_v1_2026-07-06}"
ROOT="${ANNA_LORA_ROOT:-/workspace/anna_lora}"
DIAG_DIR="${ANNA_LORA_DIAG_DIR:-/workspace/fanvue}"
LOG_FILE="$DIAG_DIR/anna_lora_train.log"
ARCHIVE_NAME="${ANNA_LORA_ARCHIVE_NAME:-anna_x_model_v1_2026-07-06_FULL_WITH_DATASET.tar.gz}"
ARCHIVE_ENC_NAME="${ANNA_LORA_ARCHIVE_ENC_NAME:-${ARCHIVE_NAME}.enc}"
ARCHIVE_SHA256="${ANNA_LORA_ARCHIVE_SHA256:-ef2a30aa106e0b7d5fcd3e2bdcda62aa04fabd13fa75cca9fbd6ac2c9d91dc49}"
ARCHIVE_ENC_SHA256="${ANNA_LORA_ARCHIVE_ENC_SHA256:-c48cecdcadb399751a6aefad36b9de155cf95191733dd3ca70a595a2a54eaabf}"
SETUP_SCRIPT="${ANNA_LORA_SETUP_SCRIPT:-runpod_setup_and_train.sh}"
OUTPUTS_DIR="${ANNA_LORA_OUTPUTS_DIR:-$ROOT/training_runs/anna_x_model_v1/outputs}"
KEEPALIVE_AFTER_EXIT="${ANNA_LORA_KEEPALIVE_AFTER_EXIT:-true}"
OUTPUTS_ARCHIVE_MODE="${ANNA_LORA_OUTPUTS_ARCHIVE_MODE:-all}"

mkdir -p "$ROOT" "$DIAG_DIR"
touch "$LOG_FILE"

write_status() {
  local ok="$1"
  local status="$2"
  local extra="${3:-}"
  cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": $ok,
  "status": "$status",
  "run_name": "$RUN_NAME",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "log_file": "$LOG_FILE"$extra
}
JSON
}

keepalive() {
  if [ "$KEEPALIVE_AFTER_EXIT" = "true" ]; then
    echo "[anna-lora] keepalive enabled; diagnostic files remain available in $DIAG_DIR"
    tail -f /dev/null
  fi
}

on_error() {
  local exit_code="$?"
  local line_no="${1:-unknown}"
  echo "[anna-lora] failed at line $line_no with exit code $exit_code"
  tail -n 200 "$LOG_FILE" > "$DIAG_DIR/anna_lora_train_tail.log" 2>/dev/null || true
  write_status false "failed" ",
  \"exit_code\": $exit_code,
  \"failed_line\": \"$line_no\",
  \"log_tail_file\": \"$DIAG_DIR/anna_lora_train_tail.log\""
  keepalive
  exit "$exit_code"
}

trap 'on_error "$LINENO"' ERR

write_status true "booting"

if [ "${ANNA_LORA_DIAGNOSTIC_HTTP:-true}" = "true" ]; then
  python3 -m http.server "${ANNA_LORA_DIAGNOSTIC_PORT:-8888}" --directory "$DIAG_DIR" >/tmp/anna_lora_diag_http.log 2>&1 &
fi

exec >> "$LOG_FILE" 2>&1
echo "[anna-lora] boot $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ -z "${ANNA_LORA_ARCHIVE_KEY:-}" ]; then
  echo "[anna-lora] ANNA_LORA_ARCHIVE_KEY is required to decrypt the training archive."
  write_status false "missing_archive_key"
  exit 2
fi

if [ -z "${ANNA_LORA_ARCHIVE_URL:-}" ]; then
  REPO_URL="${FANVUE_BOOTSTRAP_REPO:-https://github.com/Leo-AITeam/fanvue-comfy-runtime.git}"
  REPO_REF="${FANVUE_BOOTSTRAP_REF:-main}"
  REPO_SLUG="${REPO_URL#https://github.com/}"
  REPO_SLUG="${REPO_SLUG%.git}"
  ANNA_LORA_ARCHIVE_URL="https://raw.githubusercontent.com/${REPO_SLUG}/${REPO_REF}/training_payloads/${ARCHIVE_ENC_NAME}"
fi

ARCHIVE_PATH="$ROOT/$ARCHIVE_NAME"
ARCHIVE_ENC_PATH="$ROOT/$ARCHIVE_ENC_NAME"
export ANNA_LORA_ARCHIVE_URL ARCHIVE_ENC_PATH
echo "[anna-lora] archive url: $ANNA_LORA_ARCHIVE_URL"
echo "[anna-lora] encrypted archive path: $ARCHIVE_ENC_PATH"

write_status true "downloading_archive" ",
  \"archive_url\": \"$ANNA_LORA_ARCHIVE_URL\""

python3 - <<'PY'
import os
import sys
import urllib.request

url = os.environ["ANNA_LORA_ARCHIVE_URL"]
path = os.environ["ARCHIVE_ENC_PATH"]
tmp = path + ".part"
with urllib.request.urlopen(url, timeout=120) as response, open(tmp, "wb") as out:
    while True:
        chunk = response.read(1024 * 1024)
        if not chunk:
            break
        out.write(chunk)
os.replace(tmp, path)
print(path)
PY

echo "${ARCHIVE_ENC_SHA256}  ${ARCHIVE_ENC_PATH}" | sha256sum -c -

echo "[anna-lora] decrypting archive"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in "$ARCHIVE_ENC_PATH" \
  -out "$ARCHIVE_PATH" \
  -pass env:ANNA_LORA_ARCHIVE_KEY

echo "${ARCHIVE_SHA256}  ${ARCHIVE_PATH}" | sha256sum -c -

write_status true "archive_ready" ",
  \"archive_path\": \"$ARCHIVE_PATH\""

tar -xzf "$ARCHIVE_PATH" -C "$ROOT"
SETUP="$ROOT/$RUN_NAME/$SETUP_SCRIPT"
chmod +x "$SETUP"

write_status true "training_started"

echo "[anna-lora] starting setup and training"
bash "$SETUP" "$ARCHIVE_PATH"

OUTPUTS_ARCHIVE="$DIAG_DIR/anna_lora_outputs.tar.gz"
OUTPUTS_SHA256="$DIAG_DIR/anna_lora_outputs.sha256.txt"
OUTPUTS_FILE_LIST="$DIAG_DIR/anna_lora_outputs_files.txt"
FINAL_MODEL_SHA256="$DIAG_DIR/anna_lora_final_model.sha256.txt"

if [ -d "$OUTPUTS_DIR" ]; then
  find "$OUTPUTS_DIR" -maxdepth 1 -type f -print | sort > "$OUTPUTS_FILE_LIST"
  FINAL_MODEL="$(find "$OUTPUTS_DIR" -maxdepth 1 -type f -name '*.safetensors' ! -name '*-[0-9][0-9][0-9][0-9][0-9][0-9].safetensors' | sort | head -n 1 || true)"
  if [ -n "$FINAL_MODEL" ]; then
    cp "$FINAL_MODEL" "$DIAG_DIR/$(basename "$FINAL_MODEL")"
    sha256sum "$DIAG_DIR/$(basename "$FINAL_MODEL")" > "$FINAL_MODEL_SHA256"
  fi
  if [ "$OUTPUTS_ARCHIVE_MODE" = "final" ] && [ -n "${FINAL_MODEL:-}" ]; then
    tar -czf "$OUTPUTS_ARCHIVE" -C "$DIAG_DIR" "$(basename "$FINAL_MODEL")" "$(basename "$FINAL_MODEL_SHA256")"
  else
    tar -czf "$OUTPUTS_ARCHIVE" -C "$OUTPUTS_DIR" .
  fi
  sha256sum "$OUTPUTS_ARCHIVE" > "$OUTPUTS_SHA256"
else
  echo "[anna-lora] outputs directory not found: $OUTPUTS_DIR"
fi

write_status true "training_finished" ",
  \"outputs\": \"$OUTPUTS_DIR\",
  \"outputs_archive\": \"$OUTPUTS_ARCHIVE\",
  \"outputs_sha256\": \"$OUTPUTS_SHA256\",
  \"outputs_file_list\": \"$OUTPUTS_FILE_LIST\",
  \"final_model_sha256\": \"$FINAL_MODEL_SHA256\""

echo "[anna-lora] done"
keepalive
