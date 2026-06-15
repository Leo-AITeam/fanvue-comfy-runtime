# ComfyUI API Smoke Prompt

This bundle includes `api_prompts/empty_image_smoke.json` for the first end-to-end API test.

The prompt intentionally avoids model loading. It uses ComfyUI built-in nodes only:

- `EmptyImage`
- `SaveImage`

Use this test to verify:

1. RunPod starts the Fanvue ComfyUI runtime.
2. n8n can submit a prompt to ComfyUI.
3. ComfyUI can execute the prompt.
4. n8n can poll queue/history and later collect outputs.

This is not a real Fanvue generation workflow. Real generation starts after the API path is proven.

## Qwen Image Smoke Prompt

This bundle also includes `api_prompts/qwen_image_smoke.json` for the first real GPU generation test on the current Qwen RunPod image.

It uses the preloaded model stack:

- `qwen_image_edit_2509_fp8_e4m3fn.safetensors`
- `qwen_2.5_vl_7b_fp8_scaled.safetensors`
- `qwen_image_vae.safetensors`

Known successful output from the first live test:

```text
prompt_id: e54f8ac6-6d3e-4c04-8012-6024e8df3b1e
filename: fanvue_qwen_smoke_00001_.png
size: 243 kB
```

Use this prompt before testing the heavier Flux/Klein smoke profile.

## Flux2 Klein 4B Smoke Prompt

This bundle includes `api_prompts/flux2_klein_4b_smoke.json` for the public-model Klein smoke profile.

It uses:

- `flux-2-klein-4b.safetensors`
- `qwen_3_4b.safetensors`
- `flux2-vae.safetensors`

Expected output prefix:

```text
fanvue_flux2_klein_4b_smoke
```

Use this prompt to verify the public Flux2 Klein bootstrap before testing private 9B/faceswap workflows.

## Face Detailer Smoke Template

This bundle now includes `api_prompts/face_detailer_smoke_template.json` as the first post-generation adapter candidate.

It uses:

- `z_image_turbo_bf16.safetensors`
- `qwen_3_4b.safetensors`
- `ae.safetensors`
- `sam_vit_b_01ec64.pth`
- `segm/person_yolov8m-seg.pt`

Important: this is a template, not a standalone text-to-image prompt. It contains:

```text
__INPUT_IMAGE__
```

n8n must replace that placeholder with the filename uploaded to the ComfyUI input folder before submitting the prompt. Use it after the native Klein path can upload or reuse an input image inside the active pod.

Recommended n8n upload command:

```json
{
  "command": "upload_input",
  "pod_url": "https://<pod-id>-8188.proxy.runpod.net",
  "source_url": "https://example.com/source.png",
  "filename": "anna_face_detailer_input.png",
  "input_type": "input",
  "input_subfolder": "fanvue/anna_novari69",
  "overwrite": true
}
```

The Job Runner returns:

```json
{
  "status": "input_uploaded",
  "load_image_name": "fanvue/anna_novari69/anna_face_detailer_input.png"
}
```

Replace `__INPUT_IMAGE__` with `load_image_name` before calling `submit_prompt`.

Dry-run validation is available without GPU or ComfyUI:

```json
{
  "command": "upload_input",
  "dry_run": true,
  "pod_url": "https://example-8188.proxy.runpod.net",
  "source_url": "https://example.com/input.png",
  "filename": "anna_face_detailer_input.png",
  "input_type": "input",
  "input_subfolder": "fanvue/anna_novari69"
}
```
