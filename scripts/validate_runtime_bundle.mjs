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

function modelMatchesProfile(item, profile) {
  if (profile === 'api_smoke') return false;
  if (profile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(profile);
  if (profile === 'first_full') return Boolean(item.required_for_first_test);
  return false;
}

function validateModelProfiles() {
  const checks = [];
  const manifest = readJson('models_manifest.json');
  const models = manifest.models || [];
  for (const profile of ['smoke', 'face_detailer_smoke', 'first_full']) {
    const selected = models.filter((item) => modelMatchesProfile(item, profile));
    const missing = selected.filter((item) => !item.source_url).map((item) => item.name);
    const mustBeComplete = ['smoke', 'face_detailer_smoke'].includes(profile);
    checks.push(result(mustBeComplete ? missing.length === 0 : true, `models.${profile}.source_urls`, {
      selected_model_count: selected.length,
      missing_source_count: missing.length,
      missing_sources: missing,
    }));
  }
  return checks;
}

function validateCustomNodes() {
  const manifest = readJson('custom_nodes_manifest.json');
  const requiredNodes = (manifest.nodes || []).filter((item) => item.required_for_first_test);
  const missingRepos = requiredNodes.filter((item) => !item.repo_url).map((item) => item.name);
  return [
    result(missingRepos.length === 0, 'custom_nodes.first_test.repo_urls', {
      selected_node_count: requiredNodes.length,
      missing_repo_count: missingRepos.length,
      missing_repos: missingRepos,
    }),
  ];
}

function validateRuntimePatchGuards() {
  const checks = [];
  const installerFile = 'scripts/install_custom_nodes.mjs';
  const startFile = 'scripts/start_comfyui.sh';

  try {
    const installer = fs.readFileSync(path.join(root, installerFile), 'utf8');
    for (const snippet of [
      'def normalize_dimensions(dimensions) -> Tuple[int, int]:',
      'def image_dimensions(image: np.ndarray) -> Tuple[int, int]:',
      'def safe_resize_image(image: np.ndarray, dimensions: Tuple[int, int], channels: int = 3) -> np.ndarray:',
      'heatmap_resized = safe_resize_image(heatmap, dimensions)',
      'binary_mask_resized = safe_resize_image(binary_mask, dimensions)',
      'fanvue-runtime-clipseg-compat',
    ]) {
      checks.push(result(installer.includes(snippet), 'runtime_patch.clipseg_snippet', { file: installerFile, snippet }));
    }
  } catch (error) {
    checks.push(result(false, 'runtime_patch.clipseg_snippet', { file: installerFile, error: error.message }));
  }

  try {
    const startScript = fs.readFileSync(path.join(root, startFile), 'utf8');
    for (const snippet of [
      'FANVUE_DISABLE_REACTOR',
      'FANVUE_TEST_PROFILE:-smoke',
      'face_detailer_smoke',
      'disable_baked_node "ComfyUI-ReActor"',
    ]) {
      checks.push(result(startScript.includes(snippet), 'runtime_patch.reactor_guard', { file: startFile, snippet }));
    }
  } catch (error) {
    checks.push(result(false, 'runtime_patch.reactor_guard', { file: startFile, error: error.message }));
  }

  return checks;
}

function validateUtilityScripts() {
  return [
    result(exists('scripts/import_model_sources_csv.mjs'), 'utility.import_model_sources_csv.exists', {
      file: 'scripts/import_model_sources_csv.mjs',
    }),
  ];
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
checks.push(...validateModelProfiles());
checks.push(...validateCustomNodes());
checks.push(...validateRuntimePatchGuards());
checks.push(...validateUtilityScripts());

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
