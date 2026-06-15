# Direct RunPod Tests Without n8n

Use this path when the n8n monthly execution limit is exhausted.

This does not replace the production n8n flow. It is a test harness for GPU/runtime validation.

## Required Secret

Set the RunPod API key locally:

```bash
export RUNPOD_API_KEY="..."
```

Do not commit the key.

## 1. Preview Pod Payload

This does not create a pod:

```bash
node scripts/runpod_direct_test.mjs create --dry-run --profile smoke
```

Default image:

```text
ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
```

Default GPU:

```text
NVIDIA L40S
```

## 2. Create Pod

```bash
node scripts/runpod_direct_test.mjs create --profile smoke
```

Save the returned:

```text
pod_id
comfyui_url
diagnostics_url
```

Create a pod that auto-runs the Klein smoke prompt inside the container:

```bash
node scripts/runpod_direct_test.mjs create \
  --profile smoke \
  --auto-run \
  --workflow-name "Flux Klein 4B Smoke"
```

Create a pod that auto-runs Face Detailer against an image already present in ComfyUI input storage:

```bash
node scripts/runpod_direct_test.mjs create \
  --auto-run \
  --workflow-name "Face Detailer Smoke" \
  --input-image-name fanvue/direct/source.png
```

## 3. Wait For ComfyUI

```bash
node scripts/runpod_direct_test.mjs wait --pod-id POD_ID
```

The script polls:

```text
https://POD_ID-8188.proxy.runpod.net/system_stats
```

## 4. Submit Klein Smoke Prompt

```bash
node scripts/runpod_direct_test.mjs submit \
  --pod-id POD_ID \
  --prompt api_prompts/flux2_klein_4b_smoke.json
```

Save the returned:

```text
prompt_id
```

## 5. Download Outputs

```bash
node scripts/runpod_direct_test.mjs history \
  --pod-id POD_ID \
  --prompt-id PROMPT_ID \
  --out-dir ./direct-runpod-output
```

## 6. Submit Face Detailer With A Local Input Image

This bypasses n8n `media_asset.signed_url` and `upload_input`.

Dry-run prompt build without a live pod:

```bash
node scripts/runpod_direct_test.mjs submit \
  --dry-run \
  --input-image fanvue/direct/source.png \
  --save-prompt ./direct-runpod-output/face_detailer_prompt.json
```

Live submit with ComfyUI upload:

```bash
node scripts/runpod_direct_test.mjs submit \
  --pod-id POD_ID \
  --input-file ./source.png \
  --input-subfolder fanvue/direct \
  --save-prompt ./direct-runpod-output/face_detailer_prompt.json
```

The script uploads `source.png` through the ComfyUI `/upload/image` endpoint, replaces `__INPUT_IMAGE__` in:

```text
api_prompts/face_detailer_smoke_template.json
```

Then it submits the prepared prompt.

## 7. Stop Pod

Always stop the pod after the test:

```bash
node scripts/runpod_direct_test.mjs stop --pod-id POD_ID
```

## Safer Manual Check

If a command fails, check active pods directly in RunPod Console before starting another GPU test.

## What This Saves

This direct path saves n8n executions for:

- RunPod pod create/list/check/stop.
- ComfyUI readiness polling.
- ComfyUI prompt submit.
- ComfyUI history polling.
- Output download during debugging.

n8n should only be used again for end-to-end production validation after the runtime is known-good.
