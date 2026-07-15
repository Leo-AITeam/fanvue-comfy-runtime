# anna_v2_identity_strict011_v0_1_2026-07-15

- Encrypted file: `anna_v2_identity_strict011_v0_1_2026-07-15_FULL_WITH_DATASET.tar.gz.enc`
- Encrypted SHA256: `b7d36fdeb2cd8957d6b9fd3c15ac218b09bc6a5675960dc0219e14b3156f243b`
- Decrypted SHA256: `64cee01fd79385792a75ea966aad70c3337a7aab3e1313a900dc7e5a919c5c23`
- Images: 5
- Trigger: `annav2strict011`
- Base model: `black-forest-labs/FLUX.1-dev`
- Toolkit: `ostris/ai-toolkit`
- Setup script: `runpod_setup_and_train_flux_strict011_v0_1.sh`
- Config: `training_packet/anna_v2_identity_strict011_v0_1.yaml`
- Training: 600 steps, rank 8, alpha 8, learning rate 0.00004, text encoder disabled

This is a strict diagnostic identity anchor around master 011. It intentionally excludes rejected face-search, ReActor, and diversified images because those runs drifted away from the approved face.

Do not commit or publish `archive_key.local.txt`.
