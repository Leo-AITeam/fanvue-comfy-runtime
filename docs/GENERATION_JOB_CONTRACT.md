# Generation Job Contract

This contract is the handoff format between orchestration and the RunPod runtime.

It can be produced by n8n later, but it is intentionally testable without n8n.

## Files

```text
schemas/generation_job.schema.json
job_templates/qwen_image_smoke_job.json
job_templates/face_detailer_smoke_job.json
job_templates/qwen_to_face_detailer_chain_job.json
scripts/validate_generation_job.mjs
```

## Validate One Job

```bash
node scripts/validate_generation_job.mjs . job_templates/qwen_image_smoke_job.json
node scripts/validate_generation_job.mjs . job_templates/face_detailer_smoke_job.json
node scripts/validate_generation_job.mjs . job_templates/qwen_to_face_detailer_chain_job.json
```

The validator checks:

1. required top-level fields;
2. allowed `job_type`, `content_tier`, `status`, and `input_mode`;
3. registered workflow adapter in `workflow_mapping.json`;
4. adapter/job type compatibility;
5. required inputs for the selected job type;
6. output/callback/runtime shape;
7. simple status transition safety when `metadata.previous_status` is present.

## Lifecycle

```text
queued
claimed
pod_starting
runtime_ready
generating
postprocessing
uploading
completed
```

Failure/hold states:

```text
failed
cancelled
paused
```

The runtime should always stop the RunPod pod when `runtime.stop_policy` is `always`.

## Content Tier

```text
sfw
teasing
lingerie
nude
explicit
hardcore
```

The tier is orchestration metadata. It does not bypass platform rules; it tells the upstream prompt builder and downstream publishing layer what kind of content was requested.

## Current Validated Adapters

```text
Qwen Image Edit Smoke
Face Detailer Smoke
Qwen to Face Detailer Chain
```

The chain was live-tested on 2026-06-15 without n8n:

```text
Qwen prompt: ebdc9872-b683-45c5-bd83-843c8b9917eb
Face Detailer prompt: 014744d4-5c4e-45f6-a787-0b496032ef57
```

## n8n Integration Later

When n8n executions are available again, n8n should:

1. create one `generation_job.v1` JSON object;
2. validate required fields before launching RunPod;
3. pass job fields into RunPod env vars or a mounted/downloaded job file;
4. receive the runtime callback;
5. update Supabase job/media status.

The key point: n8n should orchestrate, not redefine the generation contract.

## Worker Job File

`scripts/comfy_runtime_worker.mjs` can read a job payload directly:

```bash
FANVUE_WORKER_DRY_RUN=true \
BUNDLE_DIR="$PWD" \
FANVUE_JOB_FILE="$PWD/job_templates/face_detailer_smoke_job.json" \
node scripts/comfy_runtime_worker.mjs
```

Supported single-prompt adapters:

```text
Qwen Image Edit Smoke
Face Detailer Smoke
```

`Qwen to Face Detailer Chain` is handled by `scripts/direct_image_chain_smoke.mjs`.
