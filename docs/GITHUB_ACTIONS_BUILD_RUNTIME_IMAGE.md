# Build Runtime Image

The runtime code is ready for a dedicated RunPod image:

```text
ghcr.io/Leo-AITeam/fanvue-comfy-runtime:latest
```

The current Git token used by local push cannot create `.github/workflows/*` because it does not have the `workflow` scope. Add the workflow below manually in GitHub, or update the token scope and push it.

Path:

```text
.github/workflows/build-runtime-image.yml
```

Content:

```yaml
name: Build Fanvue Comfy Runtime Image

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - Dockerfile
      - bootstrap_fanvue_comfyui.sh
      - runpod/**
      - scripts/**
      - models_manifest.json
      - custom_nodes_manifest.json
      - workflows/**
      - api_prompts/**
      - .github/workflows/build-runtime-image.yml

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/fanvue-comfy-runtime:latest
            ghcr.io/${{ github.repository_owner }}/fanvue-comfy-runtime:${{ github.sha }}
```

After the workflow succeeds, use this image in n8n RunPod payloads:

```json
{
  "pod": {
    "image_name": "ghcr.io/Leo-AITeam/fanvue-comfy-runtime:latest"
  }
}
```
