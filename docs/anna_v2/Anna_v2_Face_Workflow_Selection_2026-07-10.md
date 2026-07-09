# Anna v2 Face Workflow Selection

Date: 2026-07-10

## Goal

Choose the best local workflow for Anna v2 Face Stability Batch.

Scope: synthetic Anna identity only. Real people/Pinterest references are not used as face identity or LoRA face data.

## Selected Workflow

### Primary: `QWEN Edit Consistent Face.json`

Path:

`/Users/leonid1/Documents/ПроэктХ/Новая папка/QWEN Edit Consistent Face.json`

Why it is the best first choice:

- Built specifically around consistent face generation/editing.
- Has explicit reference face input.
- Uses Qwen Image Edit stack:
  - `TextEncodeQwenImageEditPlus`
  - `qwen_image_edit_2509_fp8_e4m3fn.safetensors`
  - `qwen_2.5_vl_7b_fp8_scaled.safetensors`
  - `qwen_image_vae.safetensors`
- Already contains identity-lock style prompt text.
- Low complexity: 20 nodes.
- Best fit for first SFW Face Stability Batch before LoRA.

Use for:

- First 20-30 SFW face stability generations.
- Testing identity consistency from `face_passport_shortlist`.
- Building `face_passport_v1`.

Do not use for:

- NSFW/hardcore.
- Final LoRA dataset generation before QC.
- Real-person face transfer.

## Backup Workflow

### Backup: `flux pulid with prompt.json`

Path:

`/Users/leonid1/Documents/ПроэктХ/Новая папка/Aiorbust Workflow Pack/Flux/flux pulid with prompt.json`

Why it is valuable:

- Uses Flux + PuLID identity conditioning.
- Has FaceDetailer.
- Has InsightFace/PuLID stack:
  - `ApplyPulidFlux`
  - `PulidFluxInsightFaceLoader`
  - `PulidFluxEvaClipLoader`
  - `PulidFluxModelLoader`
  - `pulid_flux_v0.9.1.safetensors`
  - `flux1-dev-fp8.safetensors`
- Better suited for preserving identity while changing scene, outfit, and camera.

Risk:

- More custom-node/model dependencies.
- Needs verification on RunPod/ComfyUI before relying on it.
- Can overlock or distort face if PuLID strength is too high.

Use for:

- Second Face Stability Batch after Qwen baseline.
- Scene variation tests: cafe, gym, bedroom, Odessa/sea, golden hour.
- Identity preservation under stronger context changes.

## Later / Support Workflows

### `1girl qwen depth face detailer.json`

Good for later controlled composition, depth, and face detail. Not first because it has 54 nodes and more moving parts.

### `Face_Detailer.json`

Use as post-process / repair workflow, not as primary generator.

### `skin-details.json`

Use later for skin realism repair if Anna becomes too plastic or too smooth.

### `flux2klein-dataset-generator.json`

Potentially useful later for LoRA/dataset preparation, not before Face Passport is stable.

### `daurenbekof_dataset_captioner.json`

Useful later for captioning/tagging dataset images after final QC.

## Not Recommended For First Face Batch

### `Instagirl-portrait (2.5 workflow).json`

More video/Wan/Instagirl-oriented and too generic for Anna identity stabilization.

### `Instagirlv2.5.json`

Same issue: useful as style reference later, not a face-lock workflow.

### `Flux Samsung UltraReal.json`

Good realism/style workflow, but it lacks strong identity reference locking by itself.

### `hyperlora - instantid + controlnet + facedetailer (3).json`

Powerful but too complex for first pass. Good as an experiment after Qwen/PuLID comparison.

## Required Inputs

Use these as identity references:

`/Users/leonid1/Documents/ПроэктХ/Модель1 - Anna/для лоры/Face/face_passport_shortlist`

Primary anchors:

- `001.png`
- `073.png`
- `074.png`
- `076.png`
- `120.png`

Support anchors:

- `030.png`
- `038.png`
- `044.png`
- `052.png`
- `056.png`
- `066.png`
- `118.png`

## First Batch Rules

- SFW only.
- Portrait / half-body only.
- No lingerie, nude, hardcore, or Fanvue-ready content.
- Goal is identity stability, not monetizable content.
- Output folder should be `test_batch_review/face_stability_batch_01`.
- Every image must pass QC before entering `face_passport_v1`.

## Workflow Decision

Start with:

1. `QWEN Edit Consistent Face.json`
2. Generate 20-30 SFW face stability images.
3. QC manually against Visual Bible and Face shortlist.
4. If identity holds, create `face_passport_v1`.
5. If identity drifts under varied scenes, test `flux pulid with prompt.json` as backup.

