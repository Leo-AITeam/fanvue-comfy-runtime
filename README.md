# Fanvue ComfyUI Bootstrap Bundle

This bundle is prepared for ephemeral RunPod execution.

## Runtime Rule

RunPod storage is not used as a permanent dependency store.

At pod start:

1. clone the GitHub repository that contains this bundle;
2. install ComfyUI custom nodes;
3. download required models and LoRA files;
4. copy workflow JSON files into ComfyUI;
5. run the requested workflow;
6. write outputs to `/workspace/fanvue/output`;
7. let n8n upload outputs to external storage;
8. stop/delete the pod.

## Preferred RunPod Image

Use the project image after GitHub Actions builds it:

```text
ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
```

This image extends the current ComfyUI base image and sets the Fanvue entrypoint directly. This is more reliable than passing `dockerStartCmd` to the base image, because some base images keep their own entrypoint and ignore a replacement CMD.

The runtime auto-detects ComfyUI in common RunPod paths, including:

```text
/workspace/ComfyUI
/runpod-slim/ComfyUI
```

## Bootstrap Modes

Real mode:

```bash
FANVUE_PREFLIGHT_MODE=real ./bootstrap_fanvue_comfyui.sh
```

Real mode exits before setup if required model `source_url` values are missing.

Dry-run mode:

```bash
FANVUE_PREFLIGHT_MODE=dry_run \
FANVUE_DOWNLOAD_DRY_RUN=true \
FANVUE_NODE_INSTALL_DRY_RUN=true \
./bootstrap_fanvue_comfyui.sh
```

Dry-run mode checks the bundle and prints what would be installed/downloaded.

## First Test

Use the smoke profile first:

```text
FANVUE_TEST_PROFILE=smoke
workflows/OFM-LAB_faceswap_CLOUD_READY.json
```

This profile downloads only public HuggingFace models and verifies the GitHub -> RunPod -> ComfyUI bootstrap path.

After the private/custom model URLs are filled, switch to the full first test:

```text
FANVUE_TEST_PROFILE=first_full
workflows/OFMTechNSFW++.json
workflows/Face_Detailer.json
```

## Required n8n Payload Fields

```json
{
  "job_id": "uuid",
  "job_type": "photo",
  "character_id": "uuid",
  "workflow": {
    "name": "OFMTechNSFW++",
    "version": "phase1",
    "input_mode": "text_to_image"
  },
  "generation": {
    "seed": 12345,
    "batch_size": 1,
    "width": 1024,
    "height": 1536,
    "steps": 28,
    "cfg": 5.5
  }
}
```

## Next Missing Piece

Before a real GPU test, this bundle needs a GitHub repo URL and a bootstrap script path that RunPod can execute.

This folder is prepared to be uploaded as a GitHub repository. See:

```text
docs/CONNECT_GITHUB_REMOTE.md
docs/GITHUB_UPLOAD.md
docs/RUNPOD_ENV.md
```

Also fill:

```text
models_manifest.json
```

The `smoke` profile already includes public model URLs. The `first_full` profile still needs custom/private `source_url` values for the full Fanvue workflow.
