# RunPod Face Detailer Smoke Fix - 2026-06-15

## Summary

The first direct Face Detailer GPU smoke reached ComfyUI successfully but failed at the detector node. This was a runtime adapter issue, not a GPU, RunPod, or model-download issue.

## Attempt

- Pod ID: `i9u47z0m77md4c`
- Profile: `face_detailer_smoke`
- ComfyUI: ready, HTTP 200 on `/system_stats`
- GPU: NVIDIA L40S
- Submitted prompt ID: `25ebde1d-a65f-4088-be28-16b3979fa60c`

## Findings

- `UltralyticsDetectorProvider` was not exposed by the installed Impact Pack build.
- `CLIPSegDetectorProvider` was exposed, but failed because `ComfyUI-CLIPSeg` was not installed.
- The pod was stopped after diagnosis to avoid unnecessary GPU spend.

## Fix

- Switched the Face Detailer smoke template to `CLIPSegDetectorProvider`.
- Added `ComfyUI-CLIPSeg` to `custom_nodes_manifest.json`.
- Replaced the unavailable upstream URL `biegert/ComfyUI-CLIPSeg` with the public fork `chaoqun789/ComfyUI-CLIPSeg`.
- Added installer support for copying legacy single-file custom nodes into the ComfyUI `custom_nodes` root.
- Added a CLIPSeg compatibility patch for current ComfyUI IMAGE tensors and OpenCV resize dimensions.
- Skipped the CLIPSeg fork `requirements.txt` because it pins an old Torch/CUDA stack that can break the runtime image.
- Removed `segm/person_yolov8m-seg.pt` from the `face_detailer_smoke` model profile.
- Kept SAM and Z-Image model assets in the smoke profile.
- Added model file integrity checks to `download_models.mjs` using `expected_bytes` or `min_bytes`, with automatic deletion and retry for invalid downloads.

## Local Validation

- Runtime bundle validator: `22/22`, failed `0`
- Face Detailer model profile: `4` models, missing source URLs `0`
- A40 pod boot after the fork switch: ComfyUI ready, `CLIPSegDetectorProvider` available
- A40 prompt submission reached `FaceDetailer`; remaining blocker was old `clipseg.py` tensor/resize compatibility
- A40 pod after the CLIPSeg tensor patch reached model loading, then failed in `UNETLoader` because `z_image_turbo_bf16.safetensors` was truncated or corrupted on disk.
- Custom node dry run includes:
  - `ComfyUI-Manager`
  - `rgthree-comfy`
  - `ComfyUI-Impact-Pack`
  - `ComfyUI-CLIPSeg`, copied as `clipseg.py`
- Model download dry run for `face_detailer_smoke`: `4/4` planned models, source URLs ready
- Local runtime smoke: `10/10`, failed `0`

## Next GPU Step

Launch a fresh RunPod pod with `FANVUE_TEST_PROFILE=face_detailer_smoke`, then resubmit the Face Detailer smoke prompt. The next pod should fail fast and retry if a large model downloads with the wrong size instead of reaching ComfyUI with a corrupted safetensors file.
