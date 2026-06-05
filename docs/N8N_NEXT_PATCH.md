# n8n Next Patch

Once this repository is uploaded to GitHub, patch `Fanvue RunPod Manager` so create-pod payload includes:

```json
{
  "env": {
    "FANVUE_BOOTSTRAP_REPO_URL": "https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git",
    "FANVUE_BOOTSTRAP_REPO_REF": "main",
    "FANVUE_PREFLIGHT_MODE": "real",
    "FANVUE_FIRST_TEST_ONLY": "true"
  }
}
```

Keep `confirm_create:false` until the dry-run and preflight are clean.

Switch to `confirm_create:true` only for the real paid GPU test.
