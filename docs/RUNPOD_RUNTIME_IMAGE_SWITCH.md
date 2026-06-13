# RunPod Runtime Image Switch

## Why

The GPU smoke test on 2026-06-13 created a pod successfully, but the base image started its own ComfyUI runtime and did not run the Fanvue bootstrap script from `dockerStartCmd`.

Observed:

- pod id: `hchiofnei62hkx`;
- GPU: `NVIDIA GeForce RTX 4090`;
- ComfyUI version: `0.18.2`;
- active pods after stop: `0`;
- ComfyUI root: `/runpod-slim/ComfyUI`;
- missing smoke models in `object_info`:
  - `flux-2-klein-4b.safetensors`;
  - `qwen_3_4b.safetensors`;
  - `flux2-vae.safetensors`.

## Fix

Use the dedicated runtime image after it is built:

```text
ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
```

This image sets `/opt/fanvue-comfy-runtime/runpod/entrypoint.sh` as its Docker entrypoint, so the bootstrap no longer depends on `dockerStartCmd`.

## n8n Change

In future `run_next_queued` payloads, use:

```json
{
  "pod": {
    "image_name": "ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest",
    "container_disk_gb": 50,
    "volume_gb": 0,
    "ports": ["8188/http", "8888/http"]
  },
  "bootstrap": {
    "github_repo": "https://github.com/Leo-AITeam/fanvue-comfy-runtime.git",
    "github_ref": "main",
    "script": "runpod/entrypoint.sh",
    "workflow_bundle": "fanvue",
    "preflight_mode": "real",
    "first_test_only": true,
    "test_profile": "smoke"
  }
}
```

The `bootstrap` block can stay for now. The dedicated image can also run with no repo clone if `FANVUE_BOOTSTRAP_REPO` is empty, using the bundled code inside the image.
