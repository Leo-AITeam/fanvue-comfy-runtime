# RunPod GPU Smoke - 2026-06-18

## Scope
Direct GPU smoke for the Fanvue Comfy runtime without Fanvue API dependency.

## Local validation
- Syntax validation: passed with `node --check scripts/direct_image_chain_smoke.mjs`.
- Runtime bundle validation: passed with `node scripts/validate_runtime_bundle.mjs` (`50` checks, `0` failed).
- Chain dry-run after signal cleanup: passed.
- Dry-run report: `direct-runpod-output/chain-smoke-2026-06-18-signal-dry-run/direct_image_chain_report.json`.
- Signal cleanup added to `scripts/direct_image_chain_smoke.mjs` so tracked pods are stopped on `SIGINT`, `SIGTERM`, normal completion, and final cleanup.

## Previous live partial run
- Qwen stage passed.
- Qwen pod: `ohcs1cnwu2bdt7`
- Qwen output: `direct-runpod-output/chain-smoke-2026-06-18-live/fanvue_qwen_smoke_00001_.png`
- Qwen pod was stopped.
- Face Detailer pod: `5lz36g5jlf2ss6`
- Face Detailer run was interrupted during wait/history and was manually stopped.
- Active pod audit after manual cleanup: no active pods.

## Next live run
- Run full `Qwen -> Face Detailer` chain again when RunPod pod creation is healthy.
- Verify final image and `direct_image_chain_report.json`.
- Run a final RunPod pod list audit and stop anything active.

## Live rerun result
- Attempted full `Qwen -> Face Detailer` chain.
- Blocked before Qwen boot: RunPod API returned HTTP `500` during pod creation.
- Error: `create pod: Something went wrong. Please try again later or contact support.`
- Rerun report: `direct-runpod-output/chain-smoke-2026-06-18-live-rerun/direct_image_chain_report.json`.
- Pod audit after blocked run: no active pods were left. Only old exited pods were listed:
  - `5lz36g5jlf2ss6` (`face_detailer`, exited)
  - `ohcs1cnwu2bdt7` (`qwen`, exited)

## Next options
- Retry the same live chain after RunPod API recovers.
- If the same HTTP `500` repeats, try an alternate GPU/datacenter/template.
- If alternate capacity also fails, contact RunPod support with the create-pod error.
