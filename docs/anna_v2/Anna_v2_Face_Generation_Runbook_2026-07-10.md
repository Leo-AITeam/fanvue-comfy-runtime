# Anna v2 Face Generation Runbook - 2026-07-10

## Goal

Run the first Anna v2 SFW face-stability tests on RunPod using the existing Comfy runtime.

## Safety / Scope

- First batch is SFW only.
- Hardcore is excluded from this batch.
- Results are test outputs, not Fanvue-ready production assets.
- Real account references are moodboard only and must not be used as copied identity or LoRA identity.
- Old Anna assets remain anti-reference / test_archive only.

## Primary Runtime Path

- Repository: Leo-AITeam/fanvue-comfy-runtime
- Branch: codex/anna-lora-training-v1
- Workflow adapter: Qwen Image Edit Smoke
- Profile: qwen_edit_smoke
- GPU target: NVIDIA L40S
- Runtime image: ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest

## First Prompt Pack

Use these prompt files one by one:

- api_prompts/anna_v2_face_001_no_makeup_daylight.json
- api_prompts/anna_v2_face_002_home_mirror_warm.json
- api_prompts/anna_v2_face_003_odessa_golden_hour.json
- api_prompts/anna_v2_face_004_gym_mirror.json

## Manual QC

Approve only if:

- adult-coded woman, no teen-coded styling;
- stable grey-blue eyes and Slavic/European look;
- natural skin texture, no wax/plastic look;
- no warped anatomy, broken eyes, fused fingers, duplicated jewelry, watermark;
- face feels like one coherent Anna v2 direction across prompts.

Reject/regenerate if:

- identity drifts toward real-person resemblance;
- old Anna plastic/glamour style returns;
- childlike/teen-coded proportions or styling appear;
- image looks cheap, uncanny, or over-retouched.
