# n8n Generation Callback

The runtime worker can send one final report to n8n after ComfyUI finishes.

This keeps n8n out of long polling loops and reduces execution usage.

## Runtime Env

```text
FANVUE_CALLBACK_URL=https://leoaiteam.app.n8n.cloud/webhook/fanvue-generation-callback
FANVUE_CALLBACK_AUTH_HEADER=x-fanvue-callback-secret
FANVUE_CALLBACK_AUTH_VALUE=...
FANVUE_CALLBACK_FAILS_JOB=false
```

## n8n Endpoint

```text
POST /webhook/fanvue-generation-callback
```

The endpoint should:

1. validate `x-fanvue-callback-secret`;
2. normalize the worker report;
3. update `generation_jobs`;
4. create/update `media_assets` only after storage archive exists;
5. send one admin Telegram notification;
6. respond with `{ "ok": true }`.

## Report Shape

Success:

```json
{
  "ok": true,
  "status": "completed",
  "job_id": "generation_jobs.id",
  "character_id": "characters.id",
  "workflow_name": "Flux Klein 4B Smoke",
  "submitted": {
    "prompt_id": "comfy-prompt-id"
  },
  "history": {
    "saved_files": [
      "/workspace/fanvue/output/worker/comfy-prompt-id/image.png"
    ]
  }
}
```

Failure:

```json
{
  "ok": false,
  "status": "failed",
  "job_id": "generation_jobs.id",
  "character_id": "characters.id",
  "workflow_name": "Face Detailer Smoke",
  "error": "Prompt history timeout"
}
```

## Execution Budget Target

Target production generation flow:

1. n8n creates/approves the queued job;
2. RunPod runtime worker handles ComfyUI internally;
3. n8n receives one final callback.

Expected n8n usage: 2-3 executions per generation instead of 5-15.
