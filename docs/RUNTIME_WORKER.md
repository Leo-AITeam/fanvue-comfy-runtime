# Runtime-Side ComfyUI Worker

The runtime worker moves ComfyUI polling and prompt execution into the RunPod container.

This reduces n8n usage because n8n no longer needs to poll:

- pod readiness;
- ComfyUI `/system_stats`;
- prompt history;
- output download.

## Enable Worker

Set:

```text
FANVUE_AUTO_RUN_PROMPT=true
```

By default, the entrypoint installs custom nodes and downloads models before
starting ComfyUI. This prevents false readiness where `/system_stats` is up but
ComfyUI has not scanned the downloaded model files yet.

After ComfyUI starts, the entrypoint starts:

```text
scripts/comfy_runtime_worker.mjs
```

For debugging only, early ComfyUI startup can be restored with:

```text
FANVUE_START_COMFYUI_EARLY=true
```

## Klein Smoke Worker

```text
FANVUE_AUTO_RUN_PROMPT=true
FANVUE_WORKFLOW_NAME=Flux Klein 4B Smoke
FANVUE_API_PROMPT=api_prompts/flux2_klein_4b_smoke.json
FANVUE_FILENAME_PREFIX=fanvue_runtime_klein
```

## Face Detailer Worker

Use an already uploaded ComfyUI input filename:

```text
FANVUE_AUTO_RUN_PROMPT=true
FANVUE_WORKFLOW_NAME=Face Detailer Smoke
FANVUE_INPUT_IMAGE_NAME=fanvue/direct/source.png
FANVUE_API_PROMPT_TEMPLATE=api_prompts/face_detailer_smoke_template.json
FANVUE_FILENAME_PREFIX=fanvue_runtime_face_detailer
```

Or upload a local file from inside the pod:

```text
FANVUE_AUTO_RUN_PROMPT=true
FANVUE_WORKFLOW_NAME=Face Detailer Smoke
FANVUE_INPUT_IMAGE_PATH=/workspace/fanvue/input/source.png
FANVUE_INPUT_SUBFOLDER=fanvue/runtime
FANVUE_API_PROMPT_TEMPLATE=api_prompts/face_detailer_smoke_template.json
FANVUE_FILENAME_PREFIX=fanvue_runtime_face_detailer
```

## Reports

The worker writes:

```text
/workspace/fanvue/fanvue_worker_report.json
/workspace/ComfyUI/output/fanvue_worker_report.json
```

The report includes:

- job metadata;
- prompt preview path;
- readiness result;
- prompt submission response;
- prompt history;
- downloaded output file paths;
- downloaded output byte counts and retry attempts;
- skipped output files if download failed;
- error details when failed.

## Retry Settings

```text
FANVUE_WORKER_FETCH_RETRIES=3
FANVUE_WORKER_FETCH_RETRY_DELAY_MS=5000
FANVUE_CALLBACK_RETRIES=3
FANVUE_CALLBACK_RETRY_DELAY_MS=5000
```

Retries are used for transient ComfyUI and callback failures such as `429`, `500`, `502`, `503`, and `504`.

## Optional Final Callback

Set a callback URL when n8n is available again:

```text
FANVUE_CALLBACK_URL=https://example.app.n8n.cloud/webhook/fanvue-generation-callback
FANVUE_CALLBACK_AUTH_HEADER=x-fanvue-callback-secret
FANVUE_CALLBACK_AUTH_VALUE=...
FANVUE_CALLBACK_FAILS_JOB=false
```

The worker sends one final JSON report after completion or failure. Keep this endpoint compact:

1. update the `generation_jobs` row;
2. create/update the `media_assets` row;
3. send one Telegram notification;
4. do not poll RunPod or ComfyUI from n8n.

For dry-run validation without network calls:

```text
FANVUE_CALLBACK_URL=https://example.app.n8n.cloud/webhook/fanvue-generation-callback
FANVUE_CALLBACK_DRY_RUN=true
```

## Local Dry Run

From the repo root:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_DIR="$PWD/.dryrun_workspace/fanvue" \
COMFY_DIR="$PWD/.dryrun_ComfyUI" \
node scripts/comfy_runtime_worker.mjs
```

Face Detailer dry-run:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_DIR="$PWD/.dryrun_workspace/fanvue" \
COMFY_DIR="$PWD/.dryrun_ComfyUI" \
FANVUE_WORKFLOW_NAME="Face Detailer Smoke" \
FANVUE_INPUT_IMAGE_NAME="fanvue/direct/source.png" \
node scripts/comfy_runtime_worker.mjs
```

Job-file dry-run:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_DIR="$PWD/.dryrun_workspace/fanvue-job-file" \
COMFY_DIR="$PWD/.dryrun_workspace/ComfyUI-job-file" \
FANVUE_JOB_FILE="$PWD/job_templates/face_detailer_smoke_job.json" \
node scripts/comfy_runtime_worker.mjs
```

Qwen job-file dry-run:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_DIR="$PWD/.dryrun_workspace/fanvue-qwen-job-file" \
COMFY_DIR="$PWD/.dryrun_workspace/ComfyUI-qwen-job-file" \
FANVUE_JOB_FILE="$PWD/job_templates/qwen_image_smoke_job.json" \
node scripts/comfy_runtime_worker.mjs
```

The same payload can be passed through env:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_JOB_JSON_BASE64="$(base64 -i "$PWD/job_templates/face_detailer_smoke_job.json")" \
node scripts/comfy_runtime_worker.mjs
```

The chain job is handled by the direct chain runner:

```bash
node scripts/direct_image_chain_smoke.mjs \
  --dry-run \
  --job-file "$PWD/job_templates/qwen_to_face_detailer_chain_job.json"
```

## Production Shape Later

The worker can later call one final n8n callback:

```text
/webhook/fanvue-generation-callback
```

That callback should perform only:

1. final Supabase status update;
2. final Telegram notification;
3. no polling loops.
