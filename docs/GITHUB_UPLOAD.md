# GitHub Upload Guide

Recommended repository name:

```text
fanvue-comfy-runtime
```

Upload the contents of this folder as the repository root:

```text
outputs/fanvue-comfy-runtime-repo/
```

After upload, RunPod should receive:

```text
FANVUE_BOOTSTRAP_REPO_URL=https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git
FANVUE_BOOTSTRAP_REPO_REF=main
```

Do not commit secrets, API keys, Fanvue tokens, RunPod keys, Supabase keys, or generated output media.

Large model files should not be committed directly into git. Put them in one of these places:

1. GitHub Releases attached files;
2. Hugging Face private/public repo;
3. S3/R2 bucket with signed or public download URLs;
4. another stable HTTPS file host.

Then paste the final direct download URLs into:

```text
models_manifest.json
```

The bootstrap blocks real GPU execution until required `source_url` values are filled.
