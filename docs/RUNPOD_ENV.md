# RunPod Environment

Minimum environment variables for the pod:

```text
FANVUE_BOOTSTRAP_REPO_URL=https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git
FANVUE_BOOTSTRAP_REPO_REF=main
WORKSPACE_DIR=/workspace
COMFY_DIR=/workspace/ComfyUI
BUNDLE_DIR=/workspace/fanvue/bootstrap
FANVUE_PREFLIGHT_MODE=real
FANVUE_FIRST_TEST_ONLY=true
FANVUE_TEST_PROFILE=smoke
COMFYUI_PORT=8188
```

Profiles:

- `smoke`: first public-download test for GitHub/RunPod/ComfyUI wiring.
- `first_full`: full Fanvue first-test bundle, requires private/custom model URLs in `models_manifest.json`.

Dry-run test:

```text
FANVUE_PREFLIGHT_MODE=dry_run
FANVUE_DOWNLOAD_DRY_RUN=true
FANVUE_NODE_INSTALL_DRY_RUN=true
```

Expected command:

```bash
bash /workspace/fanvue/bootstrap/runpod/entrypoint.sh
```

If the RunPod template starts from a clean image, clone this repository first, then run the entrypoint:

```bash
mkdir -p /workspace/fanvue
git clone --depth 1 "$FANVUE_BOOTSTRAP_REPO_URL" /workspace/fanvue/bootstrap
bash /workspace/fanvue/bootstrap/runpod/entrypoint.sh
```
