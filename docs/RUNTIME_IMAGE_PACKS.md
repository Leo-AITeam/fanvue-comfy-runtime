# Runtime Image Packs

The runtime is split into a small default image and heavier model-baked packs.

## Tags

```text
ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:<git-sha>
ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-<git-sha>
```

## Photo Pack

`photo-latest` is built from `Dockerfile.photo` and bakes the current production
photo profile models into `/opt/comfyui-baked`:

```text
ae.safetensors
qwen_3_4b.safetensors
z_image_turbo_bf16.safetensors
```

The entrypoint still runs the normal bootstrap. On pod start,
`download_models.mjs` validates the baked files and reports them as
`already_exists` instead of downloading them again.

The intended n8n routing is:

```text
photo_lifestyle_v1 -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
photo_adult_v1     -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
video_*            -> future video pack
other profiles     -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
```

## Video Pack

The video pack is intentionally not enabled yet. It should get a separate
Dockerfile and tag after the photo production loop is stable.
