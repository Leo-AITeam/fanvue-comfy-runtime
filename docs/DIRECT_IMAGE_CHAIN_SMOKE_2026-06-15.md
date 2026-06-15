# Direct Image Chain Smoke - 2026-06-15

Status: passed.

This test validates the still-image chain without using n8n executions:

1. Qwen Image Edit Smoke generates the source image.
2. Face Detailer Smoke receives the Qwen output as its input image.
3. Both outputs are downloaded locally.
4. Both RunPod pods are stopped by the script.

Command:

```bash
node scripts/direct_image_chain_smoke.mjs --out-dir direct-runpod-output/chain-smoke
```

## Qwen Step

```text
profile: qwen_edit_smoke
workflow: Qwen Image Edit Smoke
pod_id: m1fculi6w89h61
prompt_id: ebdc9872-b683-45c5-bd83-843c8b9917eb
ready_ms: 214541
history_ms: 11915
output: direct-runpod-output/chain-smoke/fanvue_qwen_smoke_00001_.png
```

Result:

```text
PNG image data, 512 x 512, 8-bit/color RGB, non-interlaced
```

The Qwen pod was stopped before the Face Detailer pod was created.

## Face Detailer Step

```text
profile: face_detailer_smoke
workflow: Face Detailer Smoke
pod_id: mc5c7a0r1hnb2m
prompt_id: 014744d4-5c4e-45f6-a787-0b496032ef57
ready_ms: 328803
history_ms: 12708
input: direct-runpod-output/chain-smoke/fanvue_qwen_smoke_00001_.png
output: direct-runpod-output/chain-smoke/fanvue_direct_chain_face_detailer_00001_.png
```

Result:

```text
PNG image data, 512 x 512, 8-bit/color RGB, non-interlaced
```

The final image was visually inspected and is a valid portrait output.

## Pod Cleanup

Both created pods were stopped successfully:

```text
m1fculi6w89h61: EXITED
mc5c7a0r1hnb2m: EXITED
```

The final RunPod list check showed no active pods from this test.

## Why This Matters

This proves the core direct generation path works without n8n:

```text
GitHub runtime repo -> RunPod pod -> ComfyUI -> output download -> pod stop
```

It also proves a generated image can be passed into the next workflow adapter, which is the minimum viable media chain needed before reconnecting the production n8n queue/callback flow.

Next production step: once n8n quota is available, use n8n as a thin queue/orchestrator and keep this script as the direct fallback/debug path.
