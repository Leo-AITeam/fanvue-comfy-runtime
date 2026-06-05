# Model Source Placeholders

This folder intentionally does not contain model binaries.

Use it as a checklist for preparing download URLs. The real list is in:

```text
../models_manifest.json
```

For each row:

1. upload/find the model file;
2. copy a direct download URL;
3. paste it into `source_url`;
4. keep `target_dir` unchanged unless the ComfyUI node requires a different folder.

The first GPU test needs only models where:

```json
"required_for_first_test": true
```
