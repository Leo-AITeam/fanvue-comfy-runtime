# n8n Execution Optimization Plan

Current issue:

```text
2,500 / 2,500 monthly executions used
```

Goal:

```text
Keep n8n as a thin orchestration and control layer.
Move GPU/runtime polling and debug loops outside n8n.
```

## Rule 1. No Polling Loops In n8n

Avoid repeated n8n executions for:

- RunPod pod readiness.
- ComfyUI `/system_stats`.
- ComfyUI `/history/:prompt_id`.
- debug log probing.

Move these loops into:

- direct local scripts during development;
- RunPod-side worker code in production.

## Rule 2. Batch State Updates

Instead of updating Supabase after every tiny step, write one compact job event per phase:

```text
queued
pod_created
comfyui_ready
prompt_submitted
output_archived
completed
failed
```

Do not write every retry/probe as a separate n8n path.

## Rule 3. Split Development From Production

Development:

```text
RunPod direct test harness
ComfyUI direct API
manual Supabase SQL checks
```

Production:

```text
n8n receives command
n8n creates one generation_job
n8n starts one external worker/pod
worker handles GPU polling and output collection
worker calls one final callback
```

## Rule 4. Replace Multi-Webhook Chains With One Worker Callback

Current expensive pattern:

```text
Admin -> Supabase Service -> RunPod Manager -> Job Runner -> Native Orchestrator -> Supabase Service -> Admin
```

Optimized pattern:

```text
Admin -> Supabase job create -> External worker start
External worker -> one final n8n callback
```

Expected saving:

```text
5-15 n8n executions per GPU job
down to 2-3 n8n executions per GPU job
```

## Rule 5. Keep Admin UI Read-Only Where Possible

Admin Telegram buttons should read cached Supabase state.

Avoid buttons that call live diagnostics unless explicitly needed:

- RunPod list
- RunPod health
- pod logs
- ComfyUI health

Use manual/direct tooling for diagnostics during build phase.

## Next Patches After n8n Limit Resets

1. Add a `developer_mode` flag.
2. Hide or gate diagnostic buttons in Telegram Admin.
3. Add one `generation_job.finalize` command instead of multiple status update calls.
4. Add a worker callback webhook, for example:

```text
/webhook/fanvue-generation-callback
```

5. Move ComfyUI prompt/history/output loops into runtime-side code.
6. Keep n8n only for approvals, queue creation, and final notifications.
