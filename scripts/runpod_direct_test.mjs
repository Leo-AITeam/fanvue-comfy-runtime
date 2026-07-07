#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadEnvFile(file) {
  if (!file || !fs.existsSync(file)) return { loaded: false, file };
  const text = fs.readFileSync(file, 'utf8');
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue
      .replace(/^"([\s\S]*)"$/, '$1')
      .replace(/^'([\s\S]*)'$/, '$1');
    process.env[key] = value;
    count += 1;
  }
  return { loaded: true, file, count };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function output(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function readResponseBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function redactedCreatePayload(payload) {
  const secretEnvNames = new Set([
    'FANVUE_CALLBACK_AUTH_VALUE',
    'FANVUE_JOB_JSON_BASE64',
    'FANVUE_JOB_JSON',
    'RUNPOD_API_KEY',
    'FANVUE_RUNPOD_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FANVUE_SUPABASE_SERVICE_ROLE_KEY',
    'FANVUE_WORKER_TOKEN',
    'FANVUE_SUPABASE_WORKER_TOKEN',
    'GITHUB_TOKEN',
    'HF_TOKEN',
    'ANNA_LORA_TEST_ASSET_URL',
    'ANNA_LORA_TEST_ASSET_KEY',
  ]);
  const env = { ...(payload.env || {}) };
  for (const name of secretEnvNames) {
    if (env[name]) env[name] = '***';
  }
  return {
    ...payload,
    env,
  };
}

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = /token|key|secret|password|authorization|env/i.test(key) ? '***' : redactSecrets(nested);
    }
    return out;
  }
  if (typeof value === 'string') {
    return value
      .replace(/rpa_[A-Za-z0-9_-]+/g, '<RUNPOD_API_KEY>')
      .replace(/hf_[A-Za-z0-9_-]+/g, '<HF_TOKEN>');
  }
  return value;
}

const command = argValue('command', args[0] || 'help');
const bundleDir = path.resolve(argValue('bundle-dir', process.env.BUNDLE_DIR || '.'));
const envFile = path.resolve(argValue('local-env-file', process.env.FANVUE_ENV_FILE || path.join(bundleDir, '.env.local')));
const envFileStatus = hasFlag('no-env-file') ? { loaded: false, skipped: true, file: envFile } : loadEnvFile(envFile);
const apiBase = process.env.RUNPOD_REST_BASE_URL || 'https://rest.runpod.io/v1';
const defaultComfyTemplateId = process.env.RUNPOD_COMFY_TEMPLATE_ID || 'cw3nka7d08';
const defaultRuntimeImageName = process.env.RUNPOD_RUNTIME_IMAGE_NAME || 'ghcr.io/leo-aiteam/fanvue-comfy-runtime:latest';
const directComfyImageName = process.env.RUNPOD_COMFY_IMAGE_NAME || 'runpod/comfyui:cuda12.8';
const maxGpuPriceUsd = Number(process.env.RUNPOD_MAX_GPU_PRICE_USD || '1');
const gpuPriceCatalog = {
  'NVIDIA GeForce RTX 5090': { secure: 0.99, community: 0.69, vram_gb: 32 },
  'NVIDIA GeForce RTX 4090': { secure: 0.69, community: 0.34, vram_gb: 24 },
  'NVIDIA L40S': { secure: 0.99, community: 0.79, vram_gb: 48 },
  'NVIDIA RTX 6000 Ada Generation': { secure: 0.77, community: 0.74, vram_gb: 48 },
  'NVIDIA RTX A6000': { secure: 0.49, community: 0.33, vram_gb: 48 },
  'NVIDIA A40': { secure: 0.44, community: 0.35, vram_gb: 48 },
  'NVIDIA L40': { secure: 0.82, community: 0.69, vram_gb: 48 },
};

function priceForGpu(name) {
  const prices = gpuPriceCatalog[name];
  if (!prices) return Infinity;
  return Math.min(prices.secure || Infinity, prices.community || Infinity);
}

function defaultGpuTypeIds() {
  return [
    'NVIDIA GeForce RTX 5090',
    'NVIDIA GeForce RTX 4090',
    'NVIDIA L40S',
    'NVIDIA RTX 6000 Ada Generation',
    'NVIDIA RTX A6000',
    'NVIDIA A40',
    'NVIDIA L40',
  ].filter((name) => priceForGpu(name) <= maxGpuPriceUsd);
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateBundle({ print = true } = {}) {
  const validator = path.join(bundleDir, 'scripts', 'validate_runtime_bundle.mjs');
  if (!fs.existsSync(validator)) {
    throw new Error(`Runtime bundle validator not found: ${validator}`);
  }
  const result = spawnSync(process.execPath, [validator, bundleDir], {
    encoding: 'utf8',
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  let body;
  try {
    body = stdout ? JSON.parse(stdout) : {};
  } catch {
    body = { raw: stdout };
  }
  if (print && stdout) console.log(stdout);
  if (result.status !== 0) {
    throw new Error(JSON.stringify({
      ok: false,
      status: 'bundle_validation_failed',
      exit_code: result.status,
      stderr,
      result: body,
    }, null, 2));
  }
  return body;
}

async function runpodFetch(pathname, options = {}) {
  const apiKey = requireEnv('RUNPOD_API_KEY');
  const response = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(JSON.stringify({
      ok: false,
      status: response.status,
      statusText: response.statusText,
      body,
    }, null, 2));
  }
  return body;
}

function podProxyUrl(podId, port = 8188) {
  return `https://${podId}-${port}.proxy.runpod.net`;
}

function buildCreatePayload() {
  const repo = argValue(
    'repo',
    process.env.FANVUE_BOOTSTRAP_REPO_URL ||
      process.env.FANVUE_BOOTSTRAP_REPO ||
      'https://github.com/Leo-AITeam/fanvue-comfy-runtime.git'
  );
  const ref = argValue('ref', process.env.FANVUE_BOOTSTRAP_REPO_REF || process.env.FANVUE_BOOTSTRAP_REF || 'main');
  const profile = argValue('profile', process.env.FANVUE_TEST_PROFILE || 'smoke');
  const workflowName = argValue('workflow-name', process.env.FANVUE_WORKFLOW_NAME || '');
  const requestedImageName = argValue('image', process.env.RUNPOD_IMAGE_NAME || '');
  const useTemplate = hasFlag('preinstalled-comfy-template') || process.env.FANVUE_PREINSTALLED_COMFY_TEMPLATE === 'true';
  const imageName = requestedImageName || defaultRuntimeImageName;
  const templateId = argValue('template-id', process.env.RUNPOD_TEMPLATE_ID || (useTemplate ? defaultComfyTemplateId : ''));
  const useBootstrapFromRepo =
    useTemplate ||
    imageName === directComfyImageName ||
    hasFlag('bootstrap-from-repo') ||
    process.env.FANVUE_BOOTSTRAP_FROM_REPO === 'true';
  const explicitGpuList = parseList(argValue('gpu-type-ids', process.env.RUNPOD_GPU_TYPE_IDS || ''));
  const gpu = argValue('gpu', process.env.RUNPOD_GPU_TYPE || '');
  const gpuTypeIds = explicitGpuList.length ? explicitGpuList : (gpu ? [gpu] : defaultGpuTypeIds());
  const overBudget = gpuTypeIds.filter((name) => priceForGpu(name) > maxGpuPriceUsd);
  if (overBudget.length > 0) {
    throw new Error(`GPU price guard failed; over $${maxGpuPriceUsd}/hour: ${overBudget.join(', ')}`);
  }
  if (gpuTypeIds.length === 0) {
    throw new Error(`No GPU type is configured under $${maxGpuPriceUsd}/hour`);
  }
  const name = argValue('name', `fanvue-direct-${profile}-${Date.now()}`);
  const autoRun = hasFlag('auto-run') || process.env.FANVUE_AUTO_RUN_PROMPT === 'true';
  const inputImageName = argValue('input-image-name', process.env.FANVUE_INPUT_IMAGE_NAME || '');
  const inputSubfolder = argValue('input-subfolder', process.env.FANVUE_INPUT_SUBFOLDER || 'fanvue/runtime');
  const filenamePrefix = argValue('filename-prefix', process.env.FANVUE_FILENAME_PREFIX || `fanvue_direct_${profile}`);
  const callbackUrl = argValue('callback-url', process.env.FANVUE_CALLBACK_URL || '');
  const callbackAuthHeader = argValue('callback-auth-header', process.env.FANVUE_CALLBACK_AUTH_HEADER || '');
  const payload = {
    name,
    gpuTypeIds,
    gpuCount: Number(argValue('gpu-count', process.env.RUNPOD_GPU_COUNT || '1')),
    containerDiskInGb: Number(argValue('container-disk-gb', process.env.RUNPOD_CONTAINER_DISK_GB || '80')),
    volumeInGb: Number(argValue('volume-gb', process.env.RUNPOD_VOLUME_GB || '0')),
    ports: ['8188/http', '8888/http'],
    dockerStartCmd: useBootstrapFromRepo
      ? [
          'bash',
          '-lc',
          [
            'set -euo pipefail',
            'mkdir -p /workspace/fanvue',
            'if [ ! -d /workspace/fanvue/bootstrap/.git ]; then git clone --depth 1 --branch "${FANVUE_BOOTSTRAP_REPO_REF:-main}" "${FANVUE_BOOTSTRAP_REPO_URL}" /workspace/fanvue/bootstrap; fi',
            'cd /workspace/fanvue/bootstrap',
            'git fetch --depth 1 origin "${FANVUE_BOOTSTRAP_REPO_REF:-main}"',
            'git checkout --detach FETCH_HEAD',
            'exec bash runpod/entrypoint.sh',
          ].join(' && '),
        ]
      : ['bash', '-lc', 'exec /opt/fanvue-comfy-runtime/runpod/entrypoint.sh'],
    env: {
      FANVUE_BOOTSTRAP_REPO_URL: repo,
      FANVUE_BOOTSTRAP_REPO_REF: ref,
      FANVUE_TEST_PROFILE: profile,
      FANVUE_FIRST_TEST_ONLY: String(argValue('first-test-only', process.env.FANVUE_FIRST_TEST_ONLY || 'true')),
      FANVUE_PREFLIGHT_MODE: argValue('preflight-mode', process.env.FANVUE_PREFLIGHT_MODE || 'real'),
      FANVUE_DOWNLOAD_DRY_RUN: String(argValue('download-dry-run', process.env.FANVUE_DOWNLOAD_DRY_RUN || 'false')),
      FANVUE_NODE_INSTALL_DRY_RUN: String(argValue('node-install-dry-run', process.env.FANVUE_NODE_INSTALL_DRY_RUN || (useBootstrapFromRepo ? 'true' : 'false'))),
      FANVUE_SKIP_CUSTOM_NODE_INSTALL: String(argValue('skip-custom-node-install', process.env.FANVUE_SKIP_CUSTOM_NODE_INSTALL || (useBootstrapFromRepo ? 'true' : 'false'))),
      FANVUE_START_COMFYUI_EARLY: String(argValue('start-comfyui-early', process.env.FANVUE_START_COMFYUI_EARLY || 'false')),
      COMFYUI_PORT: '8188',
      FANVUE_WORKER_FETCH_RETRIES: String(argValue('worker-fetch-retries', process.env.FANVUE_WORKER_FETCH_RETRIES || '3')),
      FANVUE_WORKER_FETCH_RETRY_DELAY_MS: String(argValue('worker-fetch-retry-delay-ms', process.env.FANVUE_WORKER_FETCH_RETRY_DELAY_MS || '5000')),
      FANVUE_AUTO_RUN_PROMPT: String(autoRun),
      FANVUE_WORKFLOW_NAME: workflowName || (inputImageName ? 'Face Detailer Smoke' : 'Flux Klein 4B Smoke'),
      FANVUE_API_PROMPT: process.env.FANVUE_API_PROMPT || '',
      FANVUE_API_PROMPT_TEMPLATE: process.env.FANVUE_API_PROMPT_TEMPLATE || '',
      FANVUE_INPUT_IMAGE_URL: process.env.FANVUE_INPUT_IMAGE_URL || '',
      FANVUE_INPUT_IMAGE_PATH: process.env.FANVUE_INPUT_IMAGE_PATH || '',
      FANVUE_INPUT_IMAGE_NAME: inputImageName,
      FANVUE_INPUT_SUBFOLDER: inputSubfolder,
      FANVUE_UPLOAD_FILENAME: process.env.FANVUE_UPLOAD_FILENAME || '',
      FANVUE_FILENAME_PREFIX: filenamePrefix,
      FANVUE_CALLBACK_URL: callbackUrl,
      FANVUE_CALLBACK_DRY_RUN: String(argValue('callback-dry-run', process.env.FANVUE_CALLBACK_DRY_RUN || 'false')),
      FANVUE_CALLBACK_FAILS_JOB: String(argValue('callback-fails-job', process.env.FANVUE_CALLBACK_FAILS_JOB || 'false')),
      FANVUE_CALLBACK_RETRIES: String(argValue('callback-retries', process.env.FANVUE_CALLBACK_RETRIES || '3')),
      FANVUE_CALLBACK_RETRY_DELAY_MS: String(argValue('callback-retry-delay-ms', process.env.FANVUE_CALLBACK_RETRY_DELAY_MS || '5000')),
      FANVUE_CALLBACK_AUTH_HEADER: callbackAuthHeader,
      FANVUE_CALLBACK_AUTH_VALUE: process.env.FANVUE_CALLBACK_AUTH_VALUE || '',
      FANVUE_JOB_JSON_BASE64: process.env.FANVUE_JOB_JSON_BASE64 || '',
      FANVUE_JOB_JSON: process.env.FANVUE_JOB_JSON || '',
      FANVUE_SUPABASE_STATUS_UPDATES: String(argValue('supabase-status-updates', process.env.FANVUE_SUPABASE_STATUS_UPDATES || 'false')),
      FANVUE_SUPABASE_FAILS_JOB: String(argValue('supabase-fails-job', process.env.FANVUE_SUPABASE_FAILS_JOB || 'false')),
      FANVUE_RUNPOD_SELF_STOP: String(argValue('runpod-self-stop', process.env.FANVUE_RUNPOD_SELF_STOP || 'false')),
      FANVUE_RUNPOD_STOP_POLICY: argValue('runpod-stop-policy', process.env.FANVUE_RUNPOD_STOP_POLICY || ''),
      FANVUE_GITHUB_OUTPUT_UPLOAD: String(process.env.FANVUE_GITHUB_OUTPUT_UPLOAD || 'false'),
      FANVUE_GITHUB_OUTPUT_REPO: process.env.FANVUE_GITHUB_OUTPUT_REPO || '',
      FANVUE_GITHUB_OUTPUT_TAG: process.env.FANVUE_GITHUB_OUTPUT_TAG || '',
      FANVUE_GITHUB_OUTPUT_RELEASE_NAME: process.env.FANVUE_GITHUB_OUTPUT_RELEASE_NAME || '',
      FANVUE_GITHUB_OUTPUT_NAME_PREFIX: process.env.FANVUE_GITHUB_OUTPUT_NAME_PREFIX || '',
      RUNPOD_API_KEY: process.env.FANVUE_PASS_RUNPOD_KEY_TO_POD === 'true' ? process.env.RUNPOD_API_KEY || '' : '',
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.FANVUE_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.FANVUE_SUPABASE_ANON_KEY || '',
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.FANVUE_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.FANVUE_PASS_SUPABASE_SERVICE_ROLE_TO_POD === 'true'
        ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.FANVUE_SUPABASE_SERVICE_ROLE_KEY || ''
        : '',
      FANVUE_WORKER_TOKEN: process.env.FANVUE_WORKER_TOKEN || process.env.FANVUE_SUPABASE_WORKER_TOKEN || '',
      GITHUB_TOKEN: process.env.FANVUE_PASS_GITHUB_TOKEN_TO_POD === 'true' ? process.env.GITHUB_TOKEN || '' : '',
      HF_TOKEN: process.env.HF_TOKEN || '',
      ANNA_LORA_TEST_ASSET_URL: process.env.ANNA_LORA_TEST_ASSET_URL || '',
      ANNA_LORA_TEST_ASSET_KEY: process.env.ANNA_LORA_TEST_ASSET_KEY || '',
    },
  };
  if (useTemplate && templateId) {
    payload.templateId = templateId;
  } else {
    payload.imageName = imageName;
  }
  return payload;
}

async function listPods() {
  output(redactSecrets(await runpodFetch('/pods')));
}

async function checkPod() {
  const podId = argValue('pod-id');
  if (!podId) throw new Error('--pod-id is required');
  output(redactSecrets(await runpodFetch(`/pods/${podId}`)));
}

async function createPod() {
  if (!hasFlag('skip-bundle-validate')) {
    const validation = validateBundle({ print: false });
    if (!validation.ok) throw new Error('Runtime bundle validation failed');
  }
  const payloadPath = argValue('payload');
  const payload = payloadPath ? readJson(payloadPath) : buildCreatePayload();
  if (hasFlag('dry-run')) {
    output({
      ok: true,
      status: 'create_dry_run',
      env_file: envFileStatus,
      bundle_validation: hasFlag('skip-bundle-validate') ? 'skipped' : 'passed',
      gpu_policy: {
        max_price_usd_per_hour: maxGpuPriceUsd,
        selected_gpu_type_ids: payload.gpuTypeIds || [],
        catalog: gpuPriceCatalog,
        preinstalled_comfy_image: payload.imageName === directComfyImageName,
        preinstalled_comfy_template: Boolean(payload.templateId),
        image_name: payload.imageName || '',
        template_id: payload.templateId || '',
        storage_policy: 'volumeInGb=0 by default; no persistent region-bound storage dependency',
      },
      payload: redactedCreatePayload(payload),
    });
    return;
  }
  const result = await runpodFetch('/pods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const podId = result.id || result.podId || result.pod?.id || null;
  output({
    ok: Boolean(podId),
    status: podId ? 'pod_created' : 'pod_create_response_without_id',
    pod_id: podId,
    comfyui_url: podId ? podProxyUrl(podId) : null,
    diagnostics_url: podId ? podProxyUrl(podId, 8888) : null,
    result: redactSecrets(result),
  });
}

async function stopPod() {
  const podId = argValue('pod-id');
  if (!podId) throw new Error('--pod-id is required');
  output(redactSecrets(await runpodFetch(`/pods/${podId}/stop`, { method: 'POST', body: '{}' })));
}

async function waitForComfy() {
  const podId = argValue('pod-id');
  if (!podId) throw new Error('--pod-id is required');
  const timeoutMs = Number(argValue('timeout-ms', '1800000'));
  const intervalMs = Number(argValue('interval-ms', '10000'));
  const baseUrl = argValue('comfy-url', podProxyUrl(podId));
  const started = Date.now();
  let lastError = '';

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/system_stats`);
      const text = await response.text();
      if (response.ok) {
        let body = {};
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
        output({
          ok: true,
          status: 'comfyui_ready',
          pod_id: podId,
          comfyui_url: baseUrl,
          waited_ms: Date.now() - started,
          system_stats: body,
        });
        return;
      }
      lastError = `${response.status} ${response.statusText}: ${text.slice(0, 300)}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`ComfyUI was not ready before timeout. Last error: ${lastError}`);
}

async function uploadInputImage(baseUrl) {
  const inputFile = argValue('input-file');
  if (!inputFile) return null;

  const abs = path.resolve(inputFile);
  const filename = argValue('input-name', path.basename(abs));
  const subfolder = argValue('input-subfolder', 'fanvue/direct');
  const form = new FormData();
  const bytes = fs.readFileSync(abs);
  form.append('image', new Blob([bytes]), filename);
  form.append('type', 'input');
  form.append('subfolder', subfolder);
  form.append('overwrite', 'true');

  const response = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    body: form,
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(`Input upload failed: ${response.status} ${JSON.stringify(body)}`);
  }
  const name = body.name || filename;
  const returnedSubfolder = body.subfolder ?? subfolder;
  return returnedSubfolder ? `${returnedSubfolder}/${name}` : name;
}

function buildFaceDetailerPrompt(loadImageName) {
  const templatePath = argValue(
    'template',
    path.join(bundleDir, 'api_prompts', 'face_detailer_smoke_template.json')
  );
  const prompt = readJson(templatePath);
  let replaced = 0;
  for (const node of Object.values(prompt)) {
    if (!node || typeof node !== 'object' || !node.inputs) continue;
    for (const [key, value] of Object.entries(node.inputs)) {
      if (value === '__INPUT_IMAGE__') {
        node.inputs[key] = loadImageName;
        replaced += 1;
      }
    }
  }
  if (prompt['9']?.inputs) prompt['9'].inputs.seed = Number(argValue('seed', String(Date.now())));
  if (prompt['10']?.inputs) {
    prompt['10'].inputs.filename_prefix = argValue('filename-prefix', 'fanvue_direct_face_detailer');
  }
  if (!replaced) throw new Error('Face Detailer template placeholder was not found');
  return prompt;
}

async function submitPrompt() {
  const podId = argValue('pod-id');
  const baseUrl = argValue('comfy-url', podId ? podProxyUrl(podId) : '');
  if (!baseUrl && !hasFlag('dry-run')) throw new Error('--pod-id or --comfy-url is required');

  let prompt;
  let uploadedImage = null;
  if (hasFlag('dry-run')) {
    const dryRunInputImage = argValue('input-image', argValue('input-file', 'fanvue/direct/source.png'));
    if (argValue('input-file') || argValue('input-image')) {
      uploadedImage = dryRunInputImage;
      prompt = buildFaceDetailerPrompt(uploadedImage);
    } else {
      const promptFile = argValue('prompt', path.join(bundleDir, 'api_prompts', 'flux2_klein_4b_smoke.json'));
      prompt = readJson(promptFile);
    }
  } else {
    uploadedImage = await uploadInputImage(baseUrl);
    if (uploadedImage) {
      prompt = buildFaceDetailerPrompt(uploadedImage);
    } else {
      const promptFile = argValue('prompt', path.join(bundleDir, 'api_prompts', 'flux2_klein_4b_smoke.json'));
      prompt = readJson(promptFile);
    }
  }

  const savePrompt = argValue('save-prompt');
  if (savePrompt) writeJson(savePrompt, prompt);

  if (hasFlag('dry-run')) {
    output({
      ok: true,
      status: 'submit_dry_run',
      uploaded_input_image: uploadedImage,
      saved_prompt: savePrompt || null,
      prompt_node_count: Object.keys(prompt).length,
    });
    return;
  }

  const clientId = argValue('client-id', `fanvue-direct-${crypto.randomUUID()}`);
  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });
  const body = await readResponseBody(response);
  if (!response.ok) throw new Error(`Prompt submit failed: ${response.status} ${JSON.stringify(body)}`);
  output({
    ok: true,
    status: 'prompt_submitted',
    pod_id: podId || null,
    comfyui_url: baseUrl,
    uploaded_input_image: uploadedImage,
    response: body,
  });
}

async function downloadHistoryOutputs(baseUrl, history, outDir) {
  const saved = [];
  for (const node of Object.values(history.outputs || {})) {
    for (const image of node.images || []) {
      const params = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder || '',
        type: image.type || 'output',
      });
      const response = await fetch(`${baseUrl}/view?${params.toString()}`);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const safeSubfolder = String(image.subfolder || '').replace(/[^a-zA-Z0-9._-]+/g, '_');
      const filename = safeSubfolder ? `${safeSubfolder}_${image.filename}` : image.filename;
      const destination = path.join(outDir, filename);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, buffer);
      saved.push(destination);
    }
  }
  return saved;
}

async function waitHistory() {
  const podId = argValue('pod-id');
  const baseUrl = argValue('comfy-url', podId ? podProxyUrl(podId) : '');
  const promptId = argValue('prompt-id');
  if (!baseUrl) throw new Error('--pod-id or --comfy-url is required');
  if (!promptId) throw new Error('--prompt-id is required');

  const timeoutMs = Number(argValue('timeout-ms', '1800000'));
  const intervalMs = Number(argValue('interval-ms', '10000'));
  const outDir = path.resolve(argValue('out-dir', 'direct-runpod-output'));
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${baseUrl}/history/${promptId}`);
    const body = await response.json().catch(async () => ({ raw: await response.text() }));
    const history = body[promptId];
    if (history?.outputs) {
      const files = await downloadHistoryOutputs(baseUrl, history, outDir);
      output({
        ok: true,
        status: 'history_ready',
        pod_id: podId || null,
        prompt_id: promptId,
        waited_ms: Date.now() - started,
        saved_files: files,
        history,
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Prompt history did not finish before timeout: ${promptId}`);
}

function help() {
  output({
    ok: true,
    commands: {
      validate: 'node scripts/runpod_direct_test.mjs validate',
      env_file: 'node scripts/runpod_direct_test.mjs create --dry-run --local-env-file .env.local',
      list: 'RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs list',
      create_dry_run: 'node scripts/runpod_direct_test.mjs create --dry-run --profile smoke',
      create_dry_run_skip_validation: 'node scripts/runpod_direct_test.mjs create --dry-run --profile smoke --skip-bundle-validate',
      create: 'RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs create --profile smoke',
      create_auto_run: 'RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs create --profile smoke --auto-run --workflow-name "Flux Klein 4B Smoke"',
      create_face_detailer_auto_run: 'RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs create --auto-run --workflow-name "Face Detailer Smoke" --input-image-name fanvue/direct/source.png',
      create_auto_run_callback: 'FANVUE_CALLBACK_URL=... FANVUE_CALLBACK_AUTH_VALUE=... RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs create --auto-run --callback-auth-header x-fanvue-callback-secret',
      wait: 'node scripts/runpod_direct_test.mjs wait --pod-id POD_ID',
      submit_klein: 'node scripts/runpod_direct_test.mjs submit --pod-id POD_ID --prompt api_prompts/flux2_klein_4b_smoke.json',
      submit_face_detailer: 'node scripts/runpod_direct_test.mjs submit --pod-id POD_ID --input-file ./source.png --input-subfolder fanvue/direct',
      submit_dry_run: 'node scripts/runpod_direct_test.mjs submit --dry-run --input-image fanvue/direct/source.png --save-prompt ./direct-runpod-output/face_detailer_prompt.json',
      history: 'node scripts/runpod_direct_test.mjs history --pod-id POD_ID --prompt-id PROMPT_ID --out-dir ./direct-runpod-output',
      stop: 'RUNPOD_API_KEY=... node scripts/runpod_direct_test.mjs stop --pod-id POD_ID',
    },
  });
}

try {
  if (command === 'help' || command === '--help' || command === '-h') help();
  else if (command === 'validate') validateBundle();
  else if (command === 'list') await listPods();
  else if (command === 'check') await checkPod();
  else if (command === 'create') await createPod();
  else if (command === 'stop') await stopPod();
  else if (command === 'wait') await waitForComfy();
  else if (command === 'submit') await submitPrompt();
  else if (command === 'history') await waitHistory();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(JSON.stringify({ ok: false, command, error: error.message }, null, 2));
  process.exit(1);
}
