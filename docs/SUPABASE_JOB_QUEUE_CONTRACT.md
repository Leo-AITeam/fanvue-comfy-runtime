# Supabase Job Queue Contract

The runtime expects orchestration to hand it a `generation_job.v1` JSON payload.

For the current Fanvue Supabase schema, use the additive SQL migration outside this repository:

```text
outputs/Fanvue_Generation_Job_Contract_Migration_2026-06-16.sql
```

That migration keeps the legacy `generation_jobs` table intact and exposes a normalized queue:

```sql
select * from v_generation_job_queue_v1 limit 5;
```

The worker payload is available as:

```sql
select generation_job_payload_v1('GENERATION_JOB_ID'::uuid);
```

An optional claim helper is available:

```sql
select claim_next_generation_job_v1();
```

Use the claim helper only when a real worker is ready to start a job, because it changes the legacy row status from `queued` to `starting_pod`.

## Legacy Status Mapping

```text
queued       -> queued
starting_pod -> pod_starting
running      -> generating
succeeded    -> completed
failed       -> failed
cancelled    -> cancelled
```

## Worker Rule

The runtime repository validates the normalized payload with:

```bash
node scripts/validate_generation_job.mjs . job_templates/qwen_to_face_detailer_chain_job.json
```

The worker should reject a job before starting GPU work when:

1. the adapter is not present in `workflow_mapping.json`;
2. the `job_type` is not allowed by the adapter;
3. required inputs are missing;
4. the status transition is invalid.

## Current Safe Path

Until n8n executions are available again:

1. create or inspect jobs directly in Supabase;
2. validate the normalized JSON contract locally;
3. launch RunPod only for one selected job;
4. write the final worker report back into `generation_jobs.output`;
5. create one `media_assets` row after output is archived.
