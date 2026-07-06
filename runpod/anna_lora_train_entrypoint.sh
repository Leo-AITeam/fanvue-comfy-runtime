#!/usr/bin/env bash
set -euo pipefail

RUN_NAME="${ANNA_LORA_RUN_NAME:-anna_x_model_v1_2026-07-06}"
ROOT="${ANNA_LORA_ROOT:-/workspace/anna_lora}"
DIAG_DIR="${ANNA_LORA_DIAG_DIR:-/workspace/fanvue}"
LOG_FILE="$DIAG_DIR/anna_lora_train.log"
ARCHIVE_NAME="${ANNA_LORA_ARCHIVE_NAME:-anna_x_model_v1_2026-07-06_FULL_WITH_DATASET.tar.gz}"
ARCHIVE_ENC_NAME="${ANNA_LORA_ARCHIVE_ENC_NAME:-${ARCHIVE_NAME}.enc}"
ARCHIVE_SHA256="${ANNA_LORA_ARCHIVE_SHA256:-f11ea749381068a7f7a22f421b729a02126b8409646fe6eaeb7b9cf60a174482}"
ARCHIVE_ENC_SHA256="${ANNA_LORA_ARCHIVE_ENC_SHA256:-ae0ff08e7f94fd1450bbb9f8e148447a0d6eb07637b0101bf61a16eeeedbc030}"

mkdir -p "$ROOT" "$DIAG_DIR"
touch "$LOG_FILE"

cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": true,
  "status": "booting",
  "run_name": "$RUN_NAME",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "log_file": "$LOG_FILE"
}
JSON

if [ "${ANNA_LORA_DIAGNOSTIC_HTTP:-true}" = "true" ]; then
  python3 -m http.server "${ANNA_LORA_DIAGNOSTIC_PORT:-8888}" --directory "$DIAG_DIR" >/tmp/anna_lora_diag_http.log 2>&1 &
fi

exec >> "$LOG_FILE" 2>&1
echo "[anna-lora] boot $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ -z "${ANNA_LORA_ARCHIVE_KEY:-}" ]; then
  echo "[anna-lora] ANNA_LORA_ARCHIVE_KEY is required to decrypt the training archive."
  cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": false,
  "status": "missing_archive_key",
  "run_name": "$RUN_NAME",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
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

cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": true,
  "status": "downloading_archive",
  "run_name": "$RUN_NAME",
  "archive_url": "$ANNA_LORA_ARCHIVE_URL",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

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

cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": true,
  "status": "archive_ready",
  "run_name": "$RUN_NAME",
  "archive_path": "$ARCHIVE_PATH",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

tar -xzf "$ARCHIVE_PATH" -C "$ROOT"
SETUP="$ROOT/$RUN_NAME/runpod_setup_and_train.sh"
chmod +x "$SETUP"

cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": true,
  "status": "training_started",
  "run_name": "$RUN_NAME",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

echo "[anna-lora] starting setup and training"
bash "$SETUP" "$ARCHIVE_PATH"

cat > "$DIAG_DIR/anna_lora_status.json" <<JSON
{
  "ok": true,
  "status": "training_finished",
  "run_name": "$RUN_NAME",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "outputs": "$ROOT/training_runs/anna_x_model_v1/outputs"
}
JSON

echo "[anna-lora] done"
