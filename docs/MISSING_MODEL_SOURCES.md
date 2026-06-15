# Missing Model Sources

These files still need verified direct download URLs before
`FANVUE_TEST_PROFILE=first_full` can run in real mode.

Do not add approximate substitutes unless the workflow has also been checked
and updated to use the substitute filename intentionally.

## Needed Files

| File | Type | Used by | Notes |
|---|---|---|---|
| `AIKOZIMAGE_000002700.safetensors` | checkpoint | `workflows/OFMTechNSFW++.json` | No verified public source found by exact filename. |
| `Detailed Nipples XL v1.0.safetensors` | LoRA | `workflows/OFMTechNSFW++.json` | Similar public filenames exist, but this exact file is not verified. |
| `Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors` | LoRA | `workflows/WAN2.2-Text_to_Video_NSFW.json` | Candidate Hugging Face repo exists but contains no model file. |
| `Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors` | LoRA | `workflows/WAN2.2-Text_to_Video_NSFW.json` | No verified direct source found by exact filename. |
| `wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors` | checkpoint | `workflows/WAN2.2-Text_to_Video_NSFW.json` | No verified direct source found by exact filename. |
| `wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors` | checkpoint | `workflows/WAN2.2-Text_to_Video_NSFW.json` | No verified direct source found by exact filename. |

## How To Add Sources

Fill `model_sources_first_test_template.csv` with direct URLs:

```csv
name,source_url,expected_bytes,min_bytes
AIKOZIMAGE_000002700.safetensors,https://example.com/path/to/file.safetensors,123456789,
```

Then run:

```bash
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --dry-run
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --strict
node scripts/verify_model_sources.mjs . first_full --strict
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/validate_runtime_bundle.mjs .
```

`expected_bytes` is preferred when the source provides an exact size.
Use `min_bytes` only when the host does not return a reliable content length.
