# Runtime Model Readiness

Generated from `models_manifest.json`.

## Summary

| Profile | Selected models | Missing source_url |
|---|---:|---:|
| smoke | 3 | 0 |
| face_detailer_smoke | 4 | 0 |
| first_full | 27 | 6 |

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

This profile remains blocked until every missing `source_url` is filled with a direct download URL.

Use the CSV importer to apply verified direct URLs safely:

```bash
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --dry-run
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --strict
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/validate_runtime_bundle.mjs .
```

The importer matches by exact model filename, reports unknown or duplicate rows,
and can fail in `--strict` mode until all `first_full` sources are filled.

| # | File | Type | Target dir | Source URL |
|---:|---|---|---|---|
| 1 | `4x-UltraSharpV2.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 2 | `4x_NMKD-Superscale-SP_178000_G.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 3 | `AIKOZIMAGE_000002700.safetensors` | model | `ComfyUI/models/checkpoints` | missing |
| 4 | `Detailed Nipples XL v1.0.safetensors` | lora | `ComfyUI/models/loras` | missing |
| 5 | `Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors` | lora | `ComfyUI/models/loras` | missing |
| 6 | `Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors` | lora | `ComfyUI/models/loras` | missing |
| 7 | `ae.safetensors` | model | `ComfyUI/models/vae` | ready |
| 8 | `bbox/face_yolov8m.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 9 | `bbox/nipple.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 10 | `bbox/pussyV2.pt` | detector_or_upscale | `ComfyUI/models` | ready |
| 11 | `controlnet-union-sdxl-promax.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 12 | `depth_anything_v2_vitl.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 13 | `dmd2_sdxl_4step_lora_fp16.safetensors` | lora | `ComfyUI/models/loras` | ready |
| 14 | `flux-2-klein-9b.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 15 | `flux2-vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 16 | `lustifySDXLNSFW_ggwpV7.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 17 | `qwen_3_4b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 18 | `qwen_3_8b.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 19 | `sam_vit_b_01ec64.pth` | detector_or_upscale | `ComfyUI/models/sams` | ready |
| 20 | `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | text_encoder | `ComfyUI/models/text_encoders` | ready |
| 21 | `wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 22 | `wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors` | model | `ComfyUI/models/checkpoints` | missing |
| 23 | `wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors` | model | `ComfyUI/models/checkpoints` | ready |
| 24 | `wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors` | model | `ComfyUI/models/checkpoints` | missing |
| 25 | `wan_2.1_vae.safetensors` | vae | `ComfyUI/models/vae` | ready |
| 26 | `x1_ITF_SkinDiffDetail_Lite_v1.pth` | detector_or_upscale | `ComfyUI/models` | ready |
| 27 | `z_image_turbo_bf16.safetensors` | model | `ComfyUI/models/diffusion_models` | ready |

