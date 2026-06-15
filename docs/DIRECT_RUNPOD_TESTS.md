# Direct RunPod Tests Without n8n

Use this path when the n8n monthly execution limit is exhausted.

This does not replace the production n8n flow. It is a test harness for GPU/runtime validation.

## Required Secret

Set the RunPod API key locally:

```bash
export RUNPOD_API_KEY="..."
```

Do not commit the key.

The direct test harness also auto-loads `.env.local` from this repository folder when the file exists:

```bash
cp .env.example .env.local
```

Then fill only your local values, for example:

```text
RUNPOD_API_KEY=...
```

`.env.local` is ignored by git.

## 1. Preview Pod Payload

Run the full local smoke suite before spending GPU:

```bash
node scripts/local_runtime_smoke.mjs
```

This does not create a pod:

```bash
node scripts/runpod_direct_test.mjs create --dry-run --profile smoke
```

Use a specific local env file when needed:

```bash
node scripts/runpod_direct_test.mjs create --dry-run --profile smoke --local-env-file .env.local
```

The create command validates the runtime bundle before building the pod payload. Run it directly when you only want the preflight:

```bash
node scripts/runpod_direct_test.mjs validate
```

Only bypass this check when you are deliberately debugging a broken bundle:

```bash
node scripts/runpod_direct_test.mjs create --dry-run --profile smoke --skip-bundle-validate
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

Add callback env vars when n8n executions are available again:

```bash
FANVUE_CALLBACK_URL="https://example.app.n8n.cloud/webhook/fanvue-generation-callback" \
FANVUE_CALLBACK_AUTH_HEADER="x-fanvue-callback-secret" \
FANVUE_CALLBACK_AUTH_VALUE="..." \
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

The latest validated GPU smoke used:

```text
Profile: face_detailer_smoke
GPU: NVIDIA RTX 6000 Ada Generation
Prompt ID: 3ab4632e-2b76-4086-a0d7-116391f9da96
Output: direct-runpod-output/fanvue_direct_face_detailer_00001_.png
```

For this profile the runtime disables pre-baked `ComfyUI-ReActor` automatically,
because ReActor can download `GFPGANv1.3.pth` during import and block ComfyUI API
endpoints that the smoke test needs.

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
  --input-file ./direct-runpod-output/fanvue_flux2_klein_4b_smoke_00001_.png \
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

## Readiness Notes

Direct tests set `FANVUE_START_COMFYUI_EARLY=false` by default. The diagnostics
URL on port `8888` can be used to watch `fanvue_runtime.log` immediately, but
the ComfyUI URL on port `8188` should not answer until required models have been
downloaded and scanned. This keeps model combo lists from being empty during
the first prompt submission.

## What This Saves

This direct path saves n8n executions for:

- RunPod pod create/list/check/stop.
- ComfyUI readiness polling.
- ComfyUI prompt submit.
- ComfyUI history polling.
- Output download during debugging.

n8n should only be used again for end-to-end production validation after the runtime is known-good.
