# Runtime Model Readiness

Generated from `models_manifest.json`.

## Summary

| Profile | Selected models | Missing source_url |
|---|---:|---:|
| smoke | 3 | 0 |
| face_detailer_smoke | 4 | 0 |
| first_full | 27 | 0 |

## Smoke Profile

This is the current safe GPU smoke profile.

| # | File | Type | Target dir | Source URL |
|---:|---|---|---|---|
| 1 | `flux2-vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 2 | `qwen_3_4b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 3 | `flux-2-klein-4b.safetensors` | model | `ComfyUI/models/diffusion_models` | ready |

## Face Detailer Smoke Profile

This is the current safe GPU image-to-image profile for the Face Detailer adapter.

| # | File | Type | Target dir | Source URL |
|---:|---|---|---|---|
| 1 | `ae.safetensors` | model | `ComfyUI/models/vae` | ready |
| 2 | `qwen_3_4b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 3 | `sam_vit_b_01ec64.pth` | detector_or_upscale | `ComfyUI/models/sams` | ready |
| 4 | `z_image_turbo_bf16.safetensors` | model | `ComfyUI/models/diffusion_models` | ready |

## First Full Profile

This profile is source-complete. It covers realistic lifestyle stills, adult-capable stills, identity/edit/detail, and controlled Wan 2.2 video smoke coverage.

Use these checks after future model changes:

```bash
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/export_model_source_tables.mjs .
node scripts/validate_runtime_bundle.mjs .
```

See `docs/MISSING_MODEL_SOURCES.md` for the legacy replacement table and import format.

### Remaining Source Gaps

No missing first full model sources.

| # | File | Type | Target dir | Source URL |
|---:|---|---|---|---|
| 1 | `4x-UltraSharpV2.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 2 | `4x_NMKD-Superscale-SP_178000_G.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 3 | `ae.safetensors` | model | `ComfyUI/models/vae` | ready |
| 4 | `bbox/face_yolov8m.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 5 | `bbox/nipple.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 6 | `bbox/pussyV2.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 7 | `controlnet-union-sdxl-promax.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 8 | `depth_anything_v2_vitl.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 9 | `dmd2_sdxl_4step_lora_fp16.safetensors` | lora | `ComfyUI/models/loras` | ready |
| 10 | `flux-2-klein-9b.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 11 | `flux2-vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 12 | `lustifySDXLNSFW_ggwpV7.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 13 | `qwen_2.5_vl_7b_fp8_scaled.safetensors` | model | `ComfyUI/models/text_encoders` | ready |
| 14 | `qwen_3_4b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 15 | `qwen_3_8b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 16 | `qwen_image_edit_2509_fp8_e4m3fn.safetensors` | model | `ComfyUI/models/diffusion_models` | ready |
| 17 | `qwen_image_vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 18 | `sam_vit_b_01ec64.pth` | detector_or_upscale | `ComfyUI/models/sams` | ready |
| 19 | `segm/person_yolov8m-seg.pt` | detector_or_upscale | `ComfyUI/models/ultralytics` | ready |
| 20 | `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 21 | `wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 22 | `wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 23 | `wan_2.1_vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 24 | `x1_ITF_SkinDiffDetail_Lite_v1.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 25 | `z_image_turbo_bf16.safetensors` | model | `ComfyUI/models/diffusion_models` | ready |
| 26 | `wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors` | lora | `ComfyUI/models/loras` | ready |
| 27 | `wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors` | lora | `ComfyUI/models/loras` | ready |
