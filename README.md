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

Use:

```text
workflows/OFMTechNSFW++.json
```

Then run face cleanup:

```text
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

Also fill:

```text
models_manifest.json
```

Each model, LoRA, VAE, detector, and upscale file needs a `source_url` before a real GPU run.
