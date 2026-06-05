# n8n Next Patch

Once this repository is uploaded to GitHub, patch `Fanvue RunPod Manager` so create-pod payload includes:

```json
{
  "env": {
    "FANVUE_BOOTSTRAP_REPO_URL": "https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git",
    "FANVUE_BOOTSTRAP_REPO_REF": "main",
    "FANVUE_PREFLIGHT_MODE": "real",
    "FANVUE_FIRST_TEST_ONLY": "true",
    "FANVUE_TEST_PROFILE": "smoke"
  }
}
```

Keep `confirm_create:false` until the dry-run and preflight are clean.

Switch to `confirm_create:true` only for the real paid GPU test.

Use `FANVUE_TEST_PROFILE=first_full` only after every full-workflow model has a valid `source_url`.
