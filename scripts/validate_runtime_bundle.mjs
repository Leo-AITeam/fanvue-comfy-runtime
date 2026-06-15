#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function result(ok, check, details = {}) {
  return { ok, check, ...details };
}

function validateJsonFile(relativePath) {
  try {
    readJson(relativePath);
    return result(true, 'json.valid', { file: relativePath });
  } catch (error) {
    return result(false, 'json.valid', { file: relativePath, error: error.message });
  }
}

function validateApiPrompt(relativePath) {
  try {
    const prompt = readJson(relativePath);
    const nodeIds = Object.keys(prompt);
    const classTypes = nodeIds.map((id) => prompt[id]?.class_type).filter(Boolean);
    return result(nodeIds.length > 0, 'api_prompt.shape', {
      file: relativePath,
      node_count: nodeIds.length,
      class_type_count: classTypes.length,
      has_save_image: classTypes.includes('SaveImage'),
    });
  } catch (error) {
    return result(false, 'api_prompt.shape', { file: relativePath, error: error.message });
  }
}

function validateFaceDetailerTemplate(relativePath) {
  try {
    const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const count = (text.match(/__INPUT_IMAGE__/g) || []).length;
    return result(count > 0, 'face_detailer.placeholder', { file: relativePath, placeholder_count: count });
  } catch (error) {
    return result(false, 'face_detailer.placeholder', { file: relativePath, error: error.message });
  }
}

function validateWorkflowMapping() {
  const file = 'workflow_mapping.json';
  if (!exists(file)) return [result(false, 'workflow_mapping.exists', { file })];
  const mapping = readJson(file);
  const checks = [result(true, 'workflow_mapping.exists', { file })];
  for (const [name, value] of Object.entries(mapping)) {
    const workflowPath = value.workflow || value.workflow_file || value.path;
    if (workflowPath) {
      checks.push(result(exists(workflowPath), 'workflow_mapping.workflow_exists', { name, file: workflowPath }));
    }
    const apiPrompt = value.api_prompt || value.apiPrompt;
    if (apiPrompt) {
      checks.push(result(exists(apiPrompt), 'workflow_mapping.api_prompt_exists', { name, file: apiPrompt }));
    }
  }
  for (const [name, adapter] of Object.entries(mapping.api_prompt_adapters || {})) {
    const apiPrompt = adapter.api_prompt || adapter.apiPrompt;
    const apiPromptTemplate = adapter.api_prompt_template || adapter.apiPromptTemplate;
    const sourceWorkflow = adapter.source_workflow || adapter.sourceWorkflow;
    if (apiPrompt) {
      checks.push(result(exists(apiPrompt), 'workflow_mapping.adapter_api_prompt_exists', { name, file: apiPrompt }));
    }
    if (apiPromptTemplate) {
      checks.push(result(exists(apiPromptTemplate), 'workflow_mapping.adapter_template_exists', { name, file: apiPromptTemplate }));
    }
    if (sourceWorkflow) {
      checks.push(result(exists(sourceWorkflow), 'workflow_mapping.adapter_source_workflow_exists', { name, file: sourceWorkflow }));
    }
    if (adapter.requires_upload_input) {
      checks.push(result(Boolean(adapter.load_image_placeholder), 'workflow_mapping.adapter_placeholder_declared', { name }));
    }
  }
  return checks;
}

function listFiles(directory, suffix) {
  const fullDir = path.join(root, directory);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => path.join(directory, file));
}

const checks = [];

for (const file of [
  'manifest.json',
  'models_manifest.json',
  'custom_nodes_manifest.json',
  'workflow_mapping.json',
]) {
  checks.push(validateJsonFile(file));
}

for (const file of listFiles('api_prompts', '.json')) {
  checks.push(validateJsonFile(file));
  checks.push(validateApiPrompt(file));
}

if (exists('api_prompts/face_detailer_smoke_template.json')) {
  checks.push(validateFaceDetailerTemplate('api_prompts/face_detailer_smoke_template.json'));
}

checks.push(...validateWorkflowMapping());

const failed = checks.filter((check) => !check.ok);
const output = {
  ok: failed.length === 0,
  root,
  total: checks.length,
  failed: failed.length,
  checks,
};

console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
