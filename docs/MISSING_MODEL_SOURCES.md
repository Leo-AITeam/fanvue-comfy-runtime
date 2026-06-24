# Missing Model Sources

Status: `first_full` is no longer blocked by missing model sources.

On 2026-06-23 the unavailable exact model files were intentionally replaced in
the runtime workflows and model manifest. The replacement policy preserves the
project goal: realistic Fanvue characters for lifestyle photos, 18+ still
content, and controlled Wan 2.2 video tests.

Source inventory files for this repository are maintained in:

- `docs/MODEL_SOURCE_PACK.md`
- `model_sources_accessible.csv`
- `model_sources_missing.csv`

Regenerate the inventories with:

```bash
node scripts/export_model_source_tables.mjs .
```

## Needed Files

No files are needed for `FANVUE_TEST_PROFILE=first_full`.

The legacy exact filenames below are kept only as historical references and are
not required for the first full profile anymore.

| Legacy file | Original role | Replacement decision |
|---|---|---|
| `AIKOZIMAGE_000002700.safetensors` | OFMTech LoRA stack entry | Replaced with `dmd2_sdxl_4step_lora_fp16.safetensors` in `workflows/OFMTechNSFW++.json`; realistic/adult output relies on `lustifySDXLNSFW_ggwpV7.safetensors` plus quality gates. |
| `Detailed Nipples XL v1.0.safetensors` | Disabled OFMTech detail LoRA node | Replaced with source-complete `dmd2_sdxl_4step_lora_fp16.safetensors` at zero strength because the node is disabled; adult detail should be handled by workflow/refine gates, not an unverified file. |
| `Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors` | Wan high-noise acceleration LoRA | Replaced with public `wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors`. |
| `Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors` | Wan low-noise acceleration LoRA | Replaced with public `wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors`. |
| `wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors` | Wan specialty adult/style LoRA | Replaced with public high-noise `lightx2v` LoRA at zero secondary strength; adult motion/style should be prompt-controlled until vetted specialty LoRAs are sourced. |
| `wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors` | Wan specialty adult/style LoRA | Replaced with public low-noise `lightx2v` LoRA at zero secondary strength; adult motion/style should be prompt-controlled until vetted specialty LoRAs are sourced. |

## Current Replacement Profiles

`models_manifest.json` now defines:

```text
photo_lifestyle_v1
photo_adult_v1
video_lifestyle_adult_v1
legacy_missing_replaced_2026_06_23
```

`first_full` is a source-complete umbrella profile that includes lifestyle
photo, adult-capable photo, identity/edit/detail, and controlled Wan 2.2 video
smoke coverage.

## Regenerate Readiness

After future model changes, run:

```bash
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/export_model_source_tables.mjs .
node scripts/validate_runtime_bundle.mjs .
```
