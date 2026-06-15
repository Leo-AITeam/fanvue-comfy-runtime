#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const workspaceDir = env('WORKSPACE_DIR', '/workspace');
const bundleDir = env('BUNDLE_DIR', path.resolve('.'));
const comfyDir = env('COMFY_DIR', path.join(workspaceDir, 'ComfyUI'));
const fanvueDir = env('FANVUE_DIR', path.join(workspaceDir, 'fanvue'));
const outputDir = env('OUTPUT_DIR', path.join(fanvueDir, 'output'));
const reportPath = env('FANVUE_WORKER_REPORT', path.join(fanvueDir, 'fanvue_worker_report.json'));
const mirrorReportPath = env('FANVUE_WORKER_REPORT_MIRROR', path.join(comfyDir, 'output', 'fanvue_worker_report.json'));
const baseUrl = env('COMFYUI_BASE_URL', `http://127.0.0.1:${env('COMFYUI_PORT', '8188')}`);
const dryRun = boolEnv('FANVUE_WORKER_DRY_RUN', false);

function bundlePath(value) {
  if (!value) return value;
  return path.isAbsolute(value) ? value : path.join(bundleDir, value);
}

function resultBase() {
  return {
    job_id: env('FANVUE_JOB_ID'),
    character_id: env('FANVUE_CHARACTER_ID'),
    job_type: env('FANVUE_JOB_TYPE', 'photo'),
    workflow_name: env('FANVUE_WORKFLOW_NAME', env('FANVUE_TEST_PROFILE', 'smoke')),
    test_profile: env('FANVUE_TEST_PROFILE', 'smoke'),
    base_url: baseUrl,
    generated_at: new Date().toISOString(),
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForComfy() {
  const timeoutMs = Number(env('FANVUE_WORKER_READY_TIMEOUT_MS', '1800000'));
  const intervalMs = Number(env('FANVUE_WORKER_READY_INTERVAL_MS', '10000'));
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/system_stats`);
      const text = await response.text();
      if (response.ok) {
        return {
          ok: true,
          waited_ms: Date.now() - started,
          system_stats: JSON.parse(text),
        };
      }
      lastError = `${response.status} ${text.slice(0, 300)}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(intervalMs);
  }
  throw new Error(`ComfyUI readiness timeout. Last error: ${lastError}`);
}

async function uploadInputImage() {
  const inputPath = env('FANVUE_INPUT_IMAGE_PATH');
  const inputName = env('FANVUE_INPUT_IMAGE_NAME');
  if (!inputPath && inputName) return inputName;
  if (!inputPath) return '';

  const filename = env('FANVUE_UPLOAD_FILENAME', path.basename(inputPath));
  const subfolder = env('FANVUE_INPUT_SUBFOLDER', 'fanvue/runtime');
  const bytes = fs.readFileSync(inputPath);
  const form = new FormData();
  form.append('image', new Blob([bytes]), filename);
  form.append('type', 'input');
  form.append('subfolder', subfolder);
  form.append('overwrite', 'true');

  const response = await fetch(`${baseUrl}/upload/image`, { method: 'POST', body: form });
  const body = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok) throw new Error(`Input upload failed: ${response.status} ${JSON.stringify(body)}`);
  return body.subfolder ? `${body.subfolder}/${body.name || filename}` : (body.name || filename);
}

function buildFaceDetailerPrompt(loadImageName) {
  const templatePath = env(
    'FANVUE_API_PROMPT_TEMPLATE',
    path.join(bundleDir, 'api_prompts', 'face_detailer_smoke_template.json')
  );
  const resolvedTemplatePath = bundlePath(templatePath);
  const prompt = readJson(resolvedTemplatePath);
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
  if (!replaced) throw new Error('Face Detailer prompt placeholder __INPUT_IMAGE__ was not found');
  if (prompt['9']?.inputs) prompt['9'].inputs.seed = Number(env('FANVUE_SEED', String(Date.now())));
  if (prompt['10']?.inputs) prompt['10'].inputs.filename_prefix = env('FANVUE_FILENAME_PREFIX', 'fanvue_runtime_face_detailer');
  return { prompt, replaced, templatePath: resolvedTemplatePath };
}

function buildPrompt(uploadedInputName) {
  if (uploadedInputName || env('FANVUE_WORKFLOW_NAME') === 'Face Detailer Smoke') {
    return buildFaceDetailerPrompt(uploadedInputName || env('FANVUE_INPUT_IMAGE_NAME'));
  }
  const promptPath = bundlePath(env('FANVUE_API_PROMPT', path.join(bundleDir, 'api_prompts', 'flux2_klein_4b_smoke.json')));
  return {
    prompt: readJson(promptPath),
    replaced: 0,
    templatePath: promptPath,
  };
}

async function submitPrompt(prompt) {
  const clientId = env('FANVUE_CLIENT_ID', `fanvue-runtime-${crypto.randomUUID()}`);
  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok) throw new Error(`Prompt submit failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function downloadOutputs(promptId, history) {
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
      const bytes = Buffer.from(await response.arrayBuffer());
      const safeSubfolder = String(image.subfolder || '').replace(/[^a-zA-Z0-9._-]+/g, '_');
      const filename = safeSubfolder ? `${safeSubfolder}_${image.filename}` : image.filename;
      const destination = path.join(outputDir, 'worker', promptId, filename);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes);
      saved.push(destination);
    }
  }
  return saved;
}

async function waitHistory(promptId) {
  const timeoutMs = Number(env('FANVUE_WORKER_HISTORY_TIMEOUT_MS', '1800000'));
  const intervalMs = Number(env('FANVUE_WORKER_HISTORY_INTERVAL_MS', '10000'));
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${baseUrl}/history/${promptId}`);
    const body = await response.json().catch(async () => ({ raw: await response.text() }));
    const history = body[promptId];
    if (history?.outputs) {
      const savedFiles = await downloadOutputs(promptId, history);
      return {
        ok: true,
        waited_ms: Date.now() - started,
        prompt_id: promptId,
        saved_files: savedFiles,
        history,
      };
    }
    await sleep(intervalMs);
  }
  throw new Error(`Prompt history timeout: ${promptId}`);
}

async function main() {
  const report = {
    ok: false,
    status: 'started',
    ...resultBase(),
  };

  try {
    const uploadedInputName = dryRun ? env('FANVUE_INPUT_IMAGE_NAME') : await uploadInputImage();
    const built = buildPrompt(uploadedInputName);
    const promptPreviewPath = env('FANVUE_WORKER_PROMPT_PREVIEW', path.join(fanvueDir, 'fanvue_worker_prompt.json'));
    writeJson(promptPreviewPath, built.prompt);

    if (dryRun) {
      Object.assign(report, {
        ok: true,
        status: 'dry_run_ready',
        uploaded_input_name: uploadedInputName || null,
        prompt_preview_path: promptPreviewPath,
        prompt_node_count: Object.keys(built.prompt).length,
        prompt_template: built.templatePath,
        replaced: built.replaced,
      });
    } else {
      const ready = await waitForComfy();
      const submitted = await submitPrompt(built.prompt);
      const promptId = submitted.prompt_id || submitted.promptId;
      if (!promptId) throw new Error(`Prompt response did not include prompt_id: ${JSON.stringify(submitted)}`);
      const history = await waitHistory(promptId);
      Object.assign(report, {
        ok: true,
        status: 'completed',
        uploaded_input_name: uploadedInputName || null,
        prompt_preview_path: promptPreviewPath,
        prompt_template: built.templatePath,
        replaced: built.replaced,
        ready,
        submitted,
        history,
      });
    }
  } catch (error) {
    Object.assign(report, {
      ok: false,
      status: 'failed',
      error: error.message,
    });
  }

  writeJson(reportPath, report);
  writeJson(mirrorReportPath, report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

await main();
