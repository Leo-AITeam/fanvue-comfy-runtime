FROM ghcr.io/leo-aiteam/comfyui-qwen:latest

WORKDIR /opt/fanvue-comfy-runtime
COPY . /opt/fanvue-comfy-runtime

RUN chmod +x \
  /opt/fanvue-comfy-runtime/runpod/entrypoint.sh \
  /opt/fanvue-comfy-runtime/bootstrap_fanvue_comfyui.sh \
  /opt/fanvue-comfy-runtime/scripts/start_comfyui.sh \
  /opt/fanvue-comfy-runtime/scripts/resolve_runtime_paths.sh

ENV BUNDLE_DIR=/opt/fanvue-comfy-runtime \
    FANVUE_FIRST_TEST_ONLY=true \
    FANVUE_TEST_PROFILE=smoke \
    FANVUE_PREFLIGHT_MODE=real \
    FANVUE_START_COMFYUI_EARLY=true \
    COMFYUI_PORT=8188

CMD ["/opt/fanvue-comfy-runtime/runpod/entrypoint.sh"]
