# External Source Research

Date: 2026-06-15

This note tracks useful local workflows, public GitHub references, and Civitai candidates for the Fanvue automation project.

## Local Workflow Library

Source folder checked:

`/Users/leonid1/Documents/ПроэктХ/Новая папка`

Inventory output:

- `docs/LOCAL_WORKFLOW_INVENTORY.md`
- `local_workflow_inventory.json`

Summary:

- Workflow JSON files scanned: 135
- Unique model references found inside workflows: 263
- Local binary model files found: 1

Important finding: the local folder is useful mostly as a workflow/reference library. It does not contain the six missing first-full model files from `models_manifest.json`.

Best local candidates:

| Priority | Workflow | Why useful |
|---:|---|---|
| 1 | `Face_Detailer.json` | Already matches the tested Face Detailer smoke path. Keep as the stable baseline. |
| 2 | `OFM-LAB_faceswap_CLOUD_READY.json` | Good next candidate for identity transfer / face swap. It is explicitly cloud-ready. |
| 3 | `QWEN Edit Consistent Face.json` and `Qwen_Edit/Qwen_EditPhoto_2511.json` | Useful for consistent-face edits and character-preserving photo changes. |
| 4 | `Aiorbust Workflow Pack/Qwen/qwen instagram influencer workflow (Aiorbust).json` | Useful later for SFW/teasing Instagram-style promo content. |
| 5 | `Aiorbust Workflow Pack/Qwen/qwen instagram influencer workflow batch generation (Aiorbust).json` | Useful later for batch promo content. |
| 6 | `Aiorbust Workflow Pack/Flux Kontext/flux kontext dev with upscaler and face detailer.json` | Useful for Flux-based image editing, but likely dependency-heavy. |
| 7 | `Aiorbust Workflow Pack/Flux Kontext/flux-kontext-nsfw.json` | Useful later as an adult-content editing workflow, after base runtime is stable. |
| 8 | `Aiorbust Workflow Pack/Wan/Wan 2.2/Wan 2.2 NSFW Rapid AIO.json` | Possible alternate video path if current Wan T2V exact model sources remain unavailable. |
| 9 | `Florence2_BatchPromptingV2.json` and `daurenbekof_dataset_captioner.json` | Useful for captioning, prompt extraction, and inspiration metadata. |

Do not integrate the whole library at once. Add one workflow profile at a time, with:

1. Workflow adapter.
2. Node dependency list.
3. Model manifest entries.
4. Dry-run validation.
5. One GPU smoke test.

## GitHub: anyrxo/fanvue-chatter

Reference:

`https://github.com/anyrxo/fanvue-chatter/tree/6b575e1ce5d1a3525195cca0d47b264479438226/fanvue-chatter`

Useful parts:

- `src/services/engine.ts`: compact example of DM turn counting, intent analysis, fan lookup, and PPV pacing.
- `src/services/ai.ts`: provider-agnostic AI wrapper and structured intent JSON.
- `src/services/fanvue.ts`: Fanvue API client wrapper shape for send message, mass message, chats, messages, media, top spenders, and earnings.
- `supabase_schema.sql`: simple creator/fan/message/sales/content schema.

How to use it:

- Use as an architectural reference, not as a direct dependency.
- Our Supabase schema is already more complete; do not replace it.
- Reuse ideas:
  - turn counter since last pitch,
  - spending tier / whale pricing logic,
  - structured intent object,
  - content recommendation before PPV pitch,
  - clear Fanvue API wrapper boundary.

Risks / gaps:

- Endpoint paths may not match the current Fanvue API exactly.
- OAuth and token refresh handling are simplified.
- Safety, pause logic, audit trail, queueing, and admin controls are lighter than our target system.
- Its dashboard duplicates work that is currently controlled through Telegram/n8n/Supabase.

Recommendation: borrow the engine concepts, not the full app.

## Civitai / External Candidates

The exact missing first-full files were not found through quick public Civitai search:

- `AIKOZIMAGE_000002700.safetensors`
- `Detailed Nipples XL v1.0.safetensors`
- `Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors`
- `Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors`
- `wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors`
- `wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors`

Potentially useful public candidates found:

| Candidate | Source | Notes |
|---|---|---|
| Max quality Qwen Edit 2511 outputs | `https://civitai.com/api/download/models/2985811` | Workflow pack candidate for Qwen Edit 2511. Useful for consistent edits, not a drop-in replacement for current video models. |
| Qwen-Image-Edit-2511-Lightning-4steps | `https://civitai.com/api/download/models/3019747` | Public Qwen edit LoRA candidate. Needs workflow compatibility check. |
| Wan 2.2 I2V A14B MoE Distill Lightx2v NVFP4 | `https://civitai.com/api/download/models/3009287` | Interesting Wan I2V model, but requires Blackwell/NVFP4 support. Not ideal for ordinary RTX 4090/Ada RunPod tests. |
| LOWEST-VRAM ULTIMATE WAN2.2 workflow | `https://civitai.com/api/download/models/2983593` | Workflow candidate only; inspect before use. |
| Dutch Blonde influencer / Fanvue LoRA | `https://civitai.com/api/download/models/2469215` | Promo/character LoRA candidate for later SFW/teasing funnel work, not core runtime. |
| Instagram/Fanvue Influencer Paola | `https://civitai.com/api/download/models/2896964` | Promo/character LoRA candidate, not core runtime. |

Recommendation: keep these in a candidate backlog. Do not put them into `models_manifest.json` until one target workflow is selected and tested.

## Next Recommended Implementation Order

1. Keep `face_detailer_smoke` as the stable smoke profile.
2. Add a `qwen_edit_smoke` profile using `Qwen_Edit/Qwen_EditPhoto_2511.json` or `QWEN Edit Consistent Face.json`.
3. Add an `ofm_faceswap_smoke` profile from `OFM-LAB_faceswap_CLOUD_READY.json`.
4. Defer Wan/video expansion until model sources are settled or an alternate lower-risk Wan workflow is chosen.
5. Add Civitai candidate URLs only to a separate candidate document or backlog until verified.
