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

Validate the bundle before launching a pod:

```bash
node scripts/validate_runtime_bundle.mjs
```

Run all local runtime smoke checks without n8n, network, or GPU:

```bash
node scripts/local_runtime_smoke.mjs
```

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

Use the API smoke profile first. It starts ComfyUI without custom-node or model downloads, then validates the proxy/API path with a built-in prompt:

```text
FANVUE_TEST_PROFILE=api_smoke
api_prompts/empty_image_smoke.json
```

Use the Klein smoke profile after the API path is reachable:

```text
FANVUE_TEST_PROFILE=smoke
api_prompts/flux2_klein_4b_smoke.json
```

This profile downloads only public HuggingFace models and verifies the GitHub -> RunPod -> ComfyUI bootstrap path.

The first post-generation adapter candidate is:

```text
api_prompts/face_detailer_smoke_template.json
```

This prompt is not standalone. It requires n8n to upload an input image to ComfyUI and replace `__INPUT_IMAGE__` with that filename before prompt submission.

If n8n executions are exhausted, use the direct RunPod test harness instead:

```bash
node scripts/runpod_direct_test.mjs validate
node scripts/runpod_direct_test.mjs create --dry-run --profile smoke
```

See:

```text
docs/DIRECT_RUNPOD_TESTS.md
docs/N8N_EXECUTION_OPTIMIZATION.md
docs/RUNTIME_WORKER.md
docs/N8N_GENERATION_CALLBACK.md
docs/NO_N8N_RUNPOD_LAUNCH_CHECKLIST.md
```

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
