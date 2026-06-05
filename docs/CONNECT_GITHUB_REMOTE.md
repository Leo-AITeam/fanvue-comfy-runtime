# Connect GitHub Remote

GitHub CLI is not installed on this machine, so create the remote repo manually:

1. Open GitHub.
2. Create a new empty repository named:

```text
fanvue-comfy-runtime
```

3. Do not add README, `.gitignore`, or license on GitHub, because this folder already has them.
4. Copy the repository HTTPS URL.

Then run from this folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git
git push -u origin main
```

After push, use this URL in n8n / RunPod:

```text
https://github.com/YOUR_USERNAME/fanvue-comfy-runtime.git
```

If GitHub asks for credentials in terminal, use a GitHub personal access token instead of your account password.
