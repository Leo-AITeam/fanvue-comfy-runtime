#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const jobFile = process.argv[3];

const allowedJobTypes = new Set([
  'photo',
  'ppv_photo',
  'face_variations',
  'face_swap',
  'quality_check',
  'video',
]);

const allowedContentTiers = new Set([
  'sfw',
  'teasing',
  'lingerie',
  'nude',
  'explicit',
  'hardcore',
]);

const allowedStatuses = [
  'queued',
  'claimed',
  'pod_starting',
  'runtime_ready',
  'generating',
  'postprocessing',
  'uploading',
  'completed',
  'failed',
  'cancelled',
  'paused',
];

const allowedInputModes = new Set([
  'text_to_image',
  'image_to_image',
  'image_edit',
  'text_to_video',
]);

const statusOrder = new Map(allowedStatuses.map((status, index) => [status, index]));

function readJson(relativePath) {
  const file = path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath));
}

function issue(ok, code, details = {}) {
  return { ok, code, ...details };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateRequiredObject(job, checks) {
  const required = [
    'schema_version',
    'job_id',
    'character_id',
    'job_type',
    'content_tier',
    'priority',
    'status',
    'workflow',
    'inputs',
    'output',
    'callback',
    'runtime',
  ];
  for (const key of required) {
    checks.push(issue(Object.hasOwn(job, key), 'job.required_field', { field: key }));
  }
  checks.push(issue(job.schema_version === 'generation_job.v1', 'job.schema_version', {
    expected: 'generation_job.v1',
    actual: job.schema_version,
  }));
  checks.push(issue(typeof job.job_id === 'string' && job.job_id.length >= 8, 'job.job_id'));
  checks.push(issue(typeof job.character_id === 'string' && job.character_id.length >= 8, 'job.character_id'));
  checks.push(issue(allowedJobTypes.has(job.job_type), 'job.job_type', { value: job.job_type }));
  checks.push(issue(allowedContentTiers.has(job.content_tier), 'job.content_tier', { value: job.content_tier }));
  checks.push(issue(Number.isInteger(job.priority) && job.priority >= 0 && job.priority <= 100, 'job.priority', {
    value: job.priority,
  }));
  checks.push(issue(statusOrder.has(job.status), 'job.status', { value: job.status }));
  checks.push(issue(isObject(job.workflow), 'job.workflow.object'));
  checks.push(issue(isObject(job.inputs), 'job.inputs.object'));
  checks.push(issue(isObject(job.output), 'job.output.object'));
  checks.push(issue(isObject(job.callback), 'job.callback.object'));
  checks.push(issue(isObject(job.runtime), 'job.runtime.object'));
}

function validateWorkflow(job, mapping, checks) {
  if (!isObject(job.workflow)) return;
  const workflow = job.workflow;
  for (const key of ['name', 'adapter', 'profile', 'input_mode']) {
    checks.push(issue(typeof workflow[key] === 'string' && workflow[key].length > 0, 'workflow.required_field', {
      field: key,
    }));
  }
  checks.push(issue(allowedInputModes.has(workflow.input_mode), 'workflow.input_mode', {
    value: workflow.input_mode,
  }));

  const adapter = mapping.api_prompt_adapters?.[workflow.adapter];
  const declaredChain = Array.isArray(adapter?.chain) ? adapter.chain : workflow.chain;
  const isKnownChain = Array.isArray(declaredChain)
    && declaredChain.length > 0
    && declaredChain.every((name) => Boolean(mapping.api_prompt_adapters?.[name]));

  checks.push(issue(Boolean(adapter) || isKnownChain, 'workflow.adapter_registered', {
    adapter: workflow.adapter,
  }));

  if (adapter) {
    checks.push(issue(adapter.job_type === job.job_type, 'workflow.adapter_job_type_match', {
      adapter: workflow.adapter,
      expected: adapter.job_type,
      actual: job.job_type,
    }));
    checks.push(issue(adapter.input_mode === workflow.input_mode, 'workflow.adapter_input_mode_match', {
      adapter: workflow.adapter,
      expected: adapter.input_mode,
      actual: workflow.input_mode,
    }));
    if (adapter.api_prompt) {
      checks.push(issue(exists(adapter.api_prompt), 'workflow.adapter_api_prompt_exists', {
        adapter: workflow.adapter,
        file: adapter.api_prompt,
      }));
    }
    if (adapter.api_prompt_template) {
      checks.push(issue(exists(adapter.api_prompt_template), 'workflow.adapter_template_exists', {
        adapter: workflow.adapter,
        file: adapter.api_prompt_template,
      }));
    }
    if (adapter.source_workflow) {
      checks.push(issue(exists(adapter.source_workflow), 'workflow.adapter_source_workflow_exists', {
        adapter: workflow.adapter,
        file: adapter.source_workflow,
      }));
    }
    if (Array.isArray(adapter.chain)) {
      for (const step of adapter.chain) {
        checks.push(issue(Boolean(mapping.api_prompt_adapters?.[step]), 'workflow.adapter_chain_step_registered', {
          adapter: workflow.adapter,
          step,
        }));
      }
    }
  }

  if (isKnownChain) {
    checks.push(issue(job.job_type === 'quality_check', 'workflow.chain_job_type', {
      expected: 'quality_check',
      actual: job.job_type,
    }));
    checks.push(issue(declaredChain.length >= 2, 'workflow.chain_min_steps', {
      count: declaredChain.length,
    }));
  }
}

function validateInputs(job, checks) {
  if (!isObject(job.inputs)) return;
  const inputs = job.inputs;
  const commonPromptTypes = new Set(['photo', 'ppv_photo', 'face_variations', 'video']);
  if (commonPromptTypes.has(job.job_type)) {
    for (const key of ['positive_prompt', 'negative_prompt', 'seed']) {
      checks.push(issue(Object.hasOwn(inputs, key), 'inputs.required_field', { job_type: job.job_type, field: key }));
    }
  }
  if (job.job_type === 'quality_check') {
    const mapping = readJson('workflow_mapping.json');
    const adapterChain = mapping.api_prompt_adapters?.[job.workflow?.adapter]?.chain;
    const jobChain = job.workflow?.chain;
    const chain = Array.isArray(adapterChain) ? adapterChain : jobChain;
    const chainProvidesInput = Array.isArray(chain) && chain.includes('Qwen Image Edit Smoke');
    if (!chainProvidesInput) {
      checks.push(issue(typeof inputs.input_image === 'string' && inputs.input_image.length > 0, 'inputs.input_image'));
    }
    for (const key of ['positive_prompt', 'negative_prompt', 'seed']) {
      checks.push(issue(Object.hasOwn(inputs, key), 'inputs.required_field', { job_type: job.job_type, field: key }));
    }
  }
  if (job.job_type === 'face_swap') {
    for (const key of ['source_face_image', 'target_image', 'seed']) {
      checks.push(issue(Object.hasOwn(inputs, key), 'inputs.required_field', { job_type: job.job_type, field: key }));
    }
  }
  if (Object.hasOwn(inputs, 'seed')) {
    checks.push(issue(Number.isInteger(inputs.seed) || inputs.seed === 'random', 'inputs.seed', { value: inputs.seed }));
  }
  for (const key of ['width', 'height', 'batch_size']) {
    if (Object.hasOwn(inputs, key)) {
      checks.push(issue(Number.isInteger(inputs[key]) && inputs[key] > 0, 'inputs.positive_integer', {
        field: key,
        value: inputs[key],
      }));
    }
  }
}

function validateOutputCallbackRuntime(job, checks) {
  if (isObject(job.output)) {
    checks.push(issue(typeof job.output.filename_prefix === 'string' && job.output.filename_prefix.length > 0, 'output.filename_prefix'));
    checks.push(issue(['external', 'local_debug'].includes(job.output.storage_target), 'output.storage_target', {
      value: job.output.storage_target,
    }));
    if (Object.hasOwn(job.output, 'expected_files')) {
      checks.push(issue(Number.isInteger(job.output.expected_files) && job.output.expected_files > 0, 'output.expected_files', {
        value: job.output.expected_files,
      }));
    }
  }

  if (isObject(job.callback)) {
    checks.push(issue(typeof job.callback.enabled === 'boolean', 'callback.enabled'));
    checks.push(issue(typeof job.callback.fails_job === 'boolean', 'callback.fails_job'));
    if (job.callback.enabled) {
      checks.push(issue(typeof job.callback.url_env === 'string' && job.callback.url_env.length > 0, 'callback.url_env'));
    }
  }

  if (isObject(job.runtime)) {
    checks.push(issue(job.runtime.provider === 'runpod', 'runtime.provider', { value: job.runtime.provider }));
    checks.push(issue(typeof job.runtime.image === 'string' && job.runtime.image.length > 0, 'runtime.image'));
    checks.push(issue(Number.isInteger(job.runtime.disk_gb) && job.runtime.disk_gb >= 20, 'runtime.disk_gb', {
      value: job.runtime.disk_gb,
    }));
    checks.push(issue(Number.isInteger(job.runtime.gpu_count) && job.runtime.gpu_count >= 1, 'runtime.gpu_count', {
      value: job.runtime.gpu_count,
    }));
    checks.push(issue(['always', 'on_success', 'manual_debug'].includes(job.runtime.stop_policy), 'runtime.stop_policy', {
      value: job.runtime.stop_policy,
    }));
    if (Object.hasOwn(job.runtime, 'timeout_seconds')) {
      checks.push(issue(Number.isInteger(job.runtime.timeout_seconds) && job.runtime.timeout_seconds >= 60, 'runtime.timeout_seconds', {
        value: job.runtime.timeout_seconds,
      }));
    }
  }
}

function validateTransitions(job, checks) {
  const previousStatus = job.metadata?.previous_status;
  if (!previousStatus) return;
  const previousIndex = statusOrder.get(previousStatus);
  const currentIndex = statusOrder.get(job.status);
  const terminal = new Set(['completed', 'failed', 'cancelled', 'paused']);
  const ok = statusOrder.has(previousStatus)
    && statusOrder.has(job.status)
    && (currentIndex >= previousIndex || terminal.has(job.status));
  checks.push(issue(ok, 'status.transition', {
    previous_status: previousStatus,
    status: job.status,
  }));
}

function validateJob(file) {
  const job = readJson(file);
  const mapping = readJson('workflow_mapping.json');
  const checks = [];
  validateRequiredObject(job, checks);
  validateWorkflow(job, mapping, checks);
  validateInputs(job, checks);
  validateOutputCallbackRuntime(job, checks);
  validateTransitions(job, checks);
  return { job, checks };
}

function usage() {
  console.error('Usage: node scripts/validate_generation_job.mjs <bundle-root> <job-json>');
  process.exit(2);
}

if (!jobFile) usage();

const { job, checks } = validateJob(jobFile);
const failed = checks.filter((check) => !check.ok);
const output = {
  ok: failed.length === 0,
  root,
  job_file: jobFile,
  job_id: job.job_id,
  job_type: job.job_type,
  workflow_adapter: job.workflow?.adapter,
  total: checks.length,
  failed: failed.length,
  checks,
};

console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
