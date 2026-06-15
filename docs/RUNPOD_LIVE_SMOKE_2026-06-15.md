# RunPod Live Smoke Test - 2026-06-15

## Result

Status: passed

The direct RunPod test path created a pod, waited for ComfyUI readiness, auto-ran the Flux Klein smoke API prompt, generated one PNG output, and stopped the pod.

## Pod

- Pod ID: `dm6jp2ikv4b86e`
- Image: `ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest`
- GPU: `NVIDIA L40S`
- Cost rate: `$0.86/hr`
- Desired status after test: `EXITED`

## ComfyUI Readiness

- Wait time: `31049 ms`
- ComfyUI version: `0.18.2`
- Python: `3.12.3`
- PyTorch: `2.11.0+cu128`
- Device: `cuda:0 NVIDIA L40S : cudaMallocAsync`
- VRAM total: `47665709056`

## Prompt

- Workflow: `Flux Klein 4B Smoke`
- API prompt: `/workspace/fanvue/bootstrap/api_prompts/flux2_klein_4b_smoke.json`
- Prompt ID: `ea43fe40-596f-4cd3-ac40-1ff95873d14e`
- Comfy status: `success`
- Worker duration: `10726 ms`
- Callback: `not_configured`

## Output

- Pod output: `/workspace/fanvue/output/worker/ea43fe40-596f-4cd3-ac40-1ff95873d14e/fanvue_flux2_klein_4b_smoke_00001_.png`
- Local verification file: `direct-runpod-output/fanvue_flux2_klein_4b_smoke_00001_.png`
- Format: `PNG image data, 512 x 512, 8-bit/color RGB, non-interlaced`
- Size: `316K`
- SHA-256: `5a81fa1844627e8082eb414bac51aa135fa358c1729a02b4dcebfc0c2aaf7e02`

## Notes

- The pod used `FANVUE_AUTO_RUN_PROMPT=true`, so the smoke prompt ran inside the container without n8n.
- The diagnostic HTTP server exposed the worker report and output under port `8888`.
- The test did not consume n8n executions.
- Generated media is ignored by git via `direct-runpod-output/`.
