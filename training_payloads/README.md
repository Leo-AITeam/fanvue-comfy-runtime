# Anna LoRA Training Payloads

This folder stores encrypted Anna identity LoRA training packets.

## Payload

### v2

- Encrypted file: `anna_x_model_v2_2026-07-06_FULL_WITH_DATASET.tar.gz.enc`
- Encrypted SHA256: `6a2a8ac6b86a0265a60f015b3baef2b0674b8746e4eba36a1171090d9cb07f5a`
- Decrypted SHA256: `12c2ee80f75ad304dc34e58f832918b1a87564de9cb4bb5ce954e17f04e7a52a`
- Decrypted contents: 33 PNG images, 33 identity-focused captions, SDXL LoRA v2 training config, RunPod setup script
- Main changes from v1:
  - same trigger token: `anna_x_model`
  - captions describe variable pose/outfit/framing/expression instead of repeating generic identity labels
  - network dim/alpha: `64/32`
  - repeats/epochs: `12/6`
  - text encoder LR: `0.000005`

### v1

- Encrypted file: `anna_x_model_v1_2026-07-06_FULL_WITH_DATASET.tar.gz.enc`
- Encrypted SHA256: `ae0ff08e7f94fd1450bbb9f8e148447a0d6eb07637b0101bf61a16eeeedbc030`
- Decrypted SHA256: `f11ea749381068a7f7a22f421b729a02126b8409646fe6eaeb7b9cf60a174482`
- Decrypted contents: 33 PNG images, 33 captions, SDXL LoRA training config, RunPod setup script

## RunPod Manager Start Payload

Use a dedicated branch/ref that contains this folder.

```json
{
  "command": "start",
  "job_id": "anna-lora-v1-20260706",
  "character_id": "anna_x_model",
  "job_type": "lora_training",
  "confirm_create": true,
  "pod": {
    "name": "anna-lora-v1-20260706",
    "image_name": "ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest",
    "gpu_type_ids": ["NVIDIA L40S", "NVIDIA GeForce RTX 4090", "NVIDIA RTX A6000"],
    "gpu_count": 1,
    "container_disk_gb": 120,
    "volume_gb": 0,
    "ports": ["8888/http"]
  },
  "bootstrap": {
    "github_repo": "https://github.com/Leo-AITeam/fanvue-comfy-runtime.git",
    "github_ref": "codex/anna-lora-training-v1",
    "script": "runpod/anna_lora_train_entrypoint.sh",
    "workflow_bundle": "anna_lora_training"
  },
  "generation": {
    "batch_size": 1
  }
}
```

## Important

Do not commit `HF_TOKEN`.
Do not commit `ANNA_LORA_ARCHIVE_KEY`.

The pod needs one of these:

- `HF_TOKEN` available in the pod environment and accepted access to `stabilityai/stable-diffusion-xl-base-1.0`
- or SDXL base already mounted at `/workspace/anna_lora/models/sd_xl_base_1.0.safetensors`

The pod also needs:

- `ANNA_LORA_ARCHIVE_KEY` to decrypt this payload

The current n8n RunPod manager does not pass arbitrary extra environment variables, so if `HF_TOKEN` and `ANNA_LORA_ARCHIVE_KEY` are not already available in the runtime image/template, training will stop with a clear missing key/model message.
