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
