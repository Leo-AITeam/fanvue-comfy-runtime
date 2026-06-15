# No-n8n RunPod Launch Checklist

Use this when n8n executions are exhausted or when testing should not burn n8n quota.

## 0. Local Env

Do not paste secrets into chat. Set them locally:

```bash
export RUNPOD_API_KEY="..."
```

Optional final callback, only when n8n executions are available:

```bash
export FANVUE_CALLBACK_URL="https://leoaiteam.app.n8n.cloud/webhook/fanvue-generation-callback"
export FANVUE_CALLBACK_AUTH_HEADER="x-fanvue-callback-secret"
export FANVUE_CALLBACK_AUTH_VALUE="..."
```

## 1. Check Current Pods

```bash
node scripts/runpod_direct_test.mjs list
```

If unknown pods are running, stop them manually in the RunPod console before testing.

## 2. Dry-run Pod Payload

Klein:

```bash
node scripts/runpod_direct_test.mjs create \
  --dry-run \
  --profile smoke \
  --auto-run \
  --workflow-name "Flux Klein 4B Smoke"
```

Face Detailer:

```bash
node scripts/runpod_direct_test.mjs create \
  --dry-run \
  --auto-run \
  --workflow-name "Face Detailer Smoke" \
  --input-image-name fanvue/direct/source.png
```

## 3. Create Auto-run Pod

Klein:

```bash
node scripts/runpod_direct_test.mjs create \
  --profile smoke \
  --auto-run \
  --workflow-name "Flux Klein 4B Smoke"
```

Expected output:

```text
pod_id
comfyui_url
diagnostics_url
```

## 4. Watch Readiness

```bash
node scripts/runpod_direct_test.mjs wait --pod-id POD_ID
```

The runtime worker also writes:

```text
/workspace/fanvue/fanvue_worker_report.json
/workspace/ComfyUI/output/fanvue_worker_report.json
```

## 5. Inspect Result

Open:

```text
https://POD_ID-8188.proxy.runpod.net
https://POD_ID-8888.proxy.runpod.net
```

Look for:

```text
fanvue_worker_report.json
output images
runtime logs
```

## 6. Stop Pod

Always stop the pod after the test:

```bash
node scripts/runpod_direct_test.mjs stop --pod-id POD_ID
```

Then confirm:

```bash
node scripts/runpod_direct_test.mjs list
```

## Success Criteria

Klein smoke:

```text
worker_report.ok = true
worker_report.status = completed
history.saved_files.length >= 1
```

Face Detailer:

```text
worker_report.ok = true
worker_report.status = completed
replaced = 1
history.saved_files.length >= 1
```

## Failure Triage

If `ComfyUI readiness timeout`:

1. open diagnostics URL;
2. inspect runtime log;
3. check model download time;
4. check custom node install errors.

If `Prompt submit failed`:

1. open ComfyUI;
2. inspect missing node/model errors;
3. verify `api_prompts/*.json`.

If `Prompt history timeout`:

1. check ComfyUI queue;
2. inspect GPU memory errors;
3. extend `FANVUE_WORKER_HISTORY_TIMEOUT_MS`.

If callback fails:

1. keep `FANVUE_CALLBACK_FAILS_JOB=false`;
2. inspect worker report;
3. retry callback later from n8n after quota reset.
