# Qwen Edit Smoke Profile

Date: 2026-06-15

`qwen_edit_smoke` is the minimal public-download profile for testing Qwen Image Edit in the runtime before adapting the heavier local workflows.

## Files

- API prompt: `api_prompts/qwen_image_smoke.json`
- Source workflow reference: `workflows/QWEN Edit Consistent Face.json`
- Mapping entry: `workflow_mapping.json` -> `Qwen Image Edit Smoke`

## Model Profile

The profile downloads three public Hugging Face files:

| Model | Target | Size check |
|---|---|---:|
| `qwen_image_edit_2509_fp8_e4m3fn.safetensors` | `ComfyUI/models/diffusion_models` | 20,430,698,424 bytes |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | `ComfyUI/models/text_encoders` | at least 7,000,000,000 bytes |
| `qwen_image_vae.safetensors` | `ComfyUI/models/vae` | 253,806,246 bytes |

## Local Checks

Run without GPU:

```bash
node scripts/validate_runtime_bundle.mjs .
node scripts/local_runtime_smoke.mjs
node scripts/verify_model_sources.mjs . qwen_edit_smoke --strict
```

Run download dry-run:

```bash
BUNDLE_DIR="$PWD" \
WORKSPACE_DIR="$PWD/tmp/qwen-download-dry" \
COMFY_DIR="$PWD/tmp/qwen-download-dry/ComfyUI" \
FANVUE_TEST_PROFILE=qwen_edit_smoke \
FANVUE_DOWNLOAD_DRY_RUN=true \
FANVUE_DOWNLOAD_REPORT="$PWD/tmp/qwen-download-dry/report.json" \
node scripts/download_models.mjs
```

## GPU Smoke Notes

This is a heavy smoke profile. Expect around 30 GB of model downloads before prompt execution.

Recommended order:

1. Use the existing direct RunPod tester.
2. Start with a high-VRAM GPU.
3. Keep `FANVUE_TEST_PROFILE=qwen_edit_smoke`.
4. Watch startup logs for missing native Qwen node classes:
   - `TextEncodeQwenImageEdit`
   - `ModelSamplingAuraFlow`
   - `UNETLoader`
   - `CLIPLoader`
   - `VAELoader`
5. If native node support is missing, update the ComfyUI/runtime image before changing the workflow.

Do not replace the full `QWEN Edit Consistent Face.json` workflow yet. First prove this minimal API prompt can boot, download models, and produce one image.

## GPU Smoke Result

Validated on 2026-06-15 with the direct RunPod tester.

| Item | Result |
|---|---|
| Pod ID | `3eqg8xn1hit8sp` |
| GPU | `NVIDIA L40S` |
| Container disk | 120 GB |
| Runtime image | `ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest` |
| ComfyUI version | `0.18.2` |
| Prompt ID | `e03b5767-f2ea-496c-a695-d6931af9514f` |
| Output | `direct-runpod-output/fanvue_qwen_smoke_00001_.png` |
| Status | Success |

Observed timing:

- ComfyUI ready after about 140 seconds.
- Prompt execution completed successfully.
- Output image was saved as a valid 512x512 RGB PNG.
- The test pod was stopped after validation and all listed RunPod pods were `EXITED`.
