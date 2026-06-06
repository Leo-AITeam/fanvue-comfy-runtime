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
