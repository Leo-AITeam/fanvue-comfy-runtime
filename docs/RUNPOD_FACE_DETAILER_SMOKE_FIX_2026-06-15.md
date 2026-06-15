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
- Skipped the CLIPSeg fork `requirements.txt` because it pins an old Torch/CUDA stack that can break the runtime image.
- Removed `segm/person_yolov8m-seg.pt` from the `face_detailer_smoke` model profile.
- Kept SAM and Z-Image model assets in the smoke profile.

## Local Validation

- Runtime bundle validator: `22/22`, failed `0`
- Face Detailer model profile: `4` models, missing source URLs `0`
- Custom node dry run includes:
  - `ComfyUI-Manager`
  - `rgthree-comfy`
  - `ComfyUI-Impact-Pack`
  - `ComfyUI-CLIPSeg`, copied as `clipseg.py`
- Local runtime smoke: `10/10`, failed `0`

## Next GPU Step

Launch a fresh RunPod pod with `FANVUE_TEST_PROFILE=face_detailer_smoke`, then resubmit the Face Detailer smoke prompt. A restart is required because the stopped pod was created before `ComfyUI-CLIPSeg` was added to the runtime bundle.
