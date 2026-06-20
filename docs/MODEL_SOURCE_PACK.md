# Fanvue Comfy Model Source Pack

Updated: 2026-06-20

This repository stores the ComfyUI runtime, workflow files, model manifests,
and direct source inventories. It does not store large model binaries in Git.

## Source Inventories

- `models_manifest.json` is the runtime source of truth used by `scripts/download_models.mjs`.
- `model_sources_accessible.csv` lists every model that currently has a direct `source_url`.
- `model_sources_missing.csv` lists models that still need a verified direct URL or an intentional replacement.
- `docs/MISSING_MODEL_SOURCES.md` tracks the exact files blocking the `first_full` profile.

Regenerate the CSV files after changing `models_manifest.json`:

```bash
node scripts/export_model_source_tables.mjs .
```

## Why Binaries Are Not Committed

Most model files are hundreds of MB or several GB. Putting them into normal Git
would make the repository slow and fragile. If we need to mirror binaries later,
use one of these instead:

1. Hugging Face model repo.
2. GitHub Release assets.
3. Git LFS only if we accept storage and bandwidth limits.

## Current Ready Sources

The public direct URLs already in `models_manifest.json` cover the smoke and
partial profiles, including:

- SDXL/Lustify and detailer support models.
- Flux 2 / Z-Image / Qwen support models.
- Wan 2.2 public base/video support models.
- Face/detailer detectors and upscalers.

## Current Blocker For `first_full`

The exact `first_full` profile is still blocked by these files because no
verified public direct URL has been found for the exact filenames:

| File | Type | Target |
|---|---|---|
| `AIKOZIMAGE_000002700.safetensors` | checkpoint | `ComfyUI/models/checkpoints` |
| `Detailed Nipples XL v1.0.safetensors` | LoRA | `ComfyUI/models/loras` |
| `Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors` | LoRA | `ComfyUI/models/loras` |
| `Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors` | LoRA | `ComfyUI/models/loras` |
| `wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors` | checkpoint | `ComfyUI/models/checkpoints` |
| `wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors` | checkpoint | `ComfyUI/models/checkpoints` |

## Replacement Rule

Do not silently add approximate substitutes. A replacement is valid only when both are true:

1. `models_manifest.json` is updated with the replacement file name and direct source URL.
2. The workflow JSON is updated to reference the replacement file intentionally.

## Manual Upload Path

If a file is available locally but cannot be downloaded from a public URL,
upload it to a durable model store and then add its direct URL to
`models_manifest.json`.

Preferred storage:

1. Hugging Face private or public model repo.
2. GitHub Release asset.
3. Civitai download URL only if it is stable and accessible from RunPod.
