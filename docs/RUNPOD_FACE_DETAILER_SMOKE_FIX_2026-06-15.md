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
- Added a strict CLIPSeg compatibility patch for current ComfyUI IMAGE tensors and OpenCV resize dimensions. The installer now fails fast if the patch does not apply.
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
- RTX 6000 Ada pod after model integrity checks downloaded all `face_detailer_smoke` models with exact byte matches, then reached `FaceDetailer`; remaining blocker was that the earlier CLIPSeg patch did not alter `resize_image`.
- Local strict CLIPSeg patch verification: `clipseg.py` contains `fanvue-runtime-clipseg-compat` markers, patched `tensor_to_numpy`, patched `resize_image`, and guarded mask normalization.
- L40S pod after delayed ComfyUI startup accepted the prompt with all models visible, then failed inside `FaceDetailer` because CLIPSeg still reached OpenCV with invalid resize dimensions. The patch now normalizes dimensions through `normalize_dimensions`, derives target dimensions through `image_dimensions(image_np)`, and fails fast if those snippets are missing.
- L40S pod after the CLIPSeg resize patch reached ComfyUI startup, but the pre-baked `ComfyUI-ReActor` node started downloading `GFPGANv1.3.pth` during import and blocked core API endpoints, including `/object_info`, `/queue`, and `/upload/image`.
- Added a `start_comfyui.sh` guard that disables the pre-baked `ComfyUI-ReActor` directory automatically for `FANVUE_TEST_PROFILE=face_detailer_smoke`, because that smoke profile does not need ReActor and should not trigger model downloads on startup.
- A40 pod after disabling ReActor reached ready state in 144 seconds, accepted image upload immediately, and accepted the Face Detailer prompt without `node_errors`.
- The prompt still failed in `FaceDetailer` because CLIPSeg produced an empty or invalid heatmap overlay for OpenCV resize. The detector only needs the first `MASK` output, so the CLIPSeg patch now uses `safe_resize_image` for heatmap/BW overlay outputs and falls back to blank overlay images instead of failing the detector.
- RTX 6000 Ada pod after the safe overlay patch reached ready state in 180 seconds, accepted image upload, completed Face Detailer successfully, and saved `direct-runpod-output/fanvue_direct_face_detailer_00001_.png`.
- Successful Face Detailer prompt ID: `3ab4632e-2b76-4086-a0d7-116391f9da96`
- Successful pod ID: `zgp2u40pu38yft`; stopped after validation.
- Local CLIPSeg patch replay with requirements skipped: copied `ComfyUI-CLIPSeg/custom_nodes/clipseg.py` into `custom_nodes/clipseg.py` and verified `normalize_dimensions`, `image_dimensions`, and `dimensions = image_dimensions(image_np)` are present.
- Custom node dry run includes:
  - `ComfyUI-Manager`
  - `rgthree-comfy`
  - `ComfyUI-Impact-Pack`
  - `ComfyUI-CLIPSeg`, copied as `clipseg.py`
- Model download dry run for `face_detailer_smoke`: `4/4` planned models, source URLs ready
- Local runtime smoke: `10/10`, failed `0`

## Next GPU Step

Face Detailer smoke now passes on GPU. Next GPU step is to promote this adapter into the orchestration path and run a combined generation + detailer callback test when n8n executions are available again or through a direct non-n8n runner.
