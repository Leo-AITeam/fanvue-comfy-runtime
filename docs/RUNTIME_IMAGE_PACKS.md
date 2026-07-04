# Runtime Image Packs

The runtime is split into a small default image and heavier model-baked packs.

## Tags

```text
ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-smoke-latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-latest
ghcr.io/leo-aiteam/fanvue-comfy-runtime:<git-sha>
ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-<git-sha>
ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-smoke-<git-sha>
ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-<git-sha>
```

## Photo Pack

`photo-latest` is built from `Dockerfile.photo` and bakes the current production
photo profile models into `/opt/comfyui-baked`:

```text
ae.safetensors
qwen_3_4b.safetensors
z_image_turbo_bf16.safetensors
inswapper_128.onnx
```

The entrypoint still runs the normal bootstrap. On pod start,
`download_models.mjs` validates the baked files and reports them as
`already_exists` instead of downloading them again.

`inswapper_128.onnx` is placed under `ComfyUI/models/insightface` so the
pre-baked `ComfyUI-ReActor` node exposes a usable `swap_model` for face-lock
workflows. `ComfyUI/models/reactor` is reserved by ReActor for saved face-model
files. `face_detailer_smoke` still disables ReActor because that smoke test does
not need face swap and should stay fast.

The intended n8n routing is:

```text
photo_lifestyle_v1           -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
photo_lifestyle_face_lock_v1 -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
photo_adult_v1               -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:photo-latest
video_lifestyle_v1           -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-smoke-latest until video-latest boot is proven
video_adult_v1               -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:video-latest
other profiles               -> ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest
```

## Video Smoke Pack

`video-smoke-latest` is built from `Dockerfile.video-smoke`. It does not bake
the Wan 2.2 model files into the container layer. The image keeps the dedicated
video profile environment, but lets the normal entrypoint download/validate
models after the container has started. This is the safer first RunPod smoke
target when the full baked video layer is too large to reach `dockerStartCmd`.

## Video Pack

`video-latest` is built from `Dockerfile.video` and bakes the current
source-complete Wan 2.2 video stack into `/opt/comfyui-baked`:

```text
umt5_xxl_fp8_e4m3fn_scaled.safetensors
wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors
wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors
wan_2.1_vae.safetensors
wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors
wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors
```

The pack is prepared for `video_lifestyle_v1` and `video_adult_v1`, but queue
claiming remains disabled until a clean GPU video smoke pass is completed.
