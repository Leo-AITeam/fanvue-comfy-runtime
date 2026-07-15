import fs from 'node:fs';
import path from 'node:path';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const mode = process.env.FANVUE_PREFLIGHT_MODE || 'real';
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const testProfile = process.env.FANVUE_TEST_PROFILE || (firstTestOnly ? 'smoke' : 'all');

function readJson(name) {
  const file = path.join(bundleDir, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${name} in ${bundleDir}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const manifest = readJson('manifest.json');
const models = readJson('models_manifest.json');
const nodes = readJson('custom_nodes_manifest.json');

function matchesProfile(item) {
  if (testProfile === 'api_smoke') return false;
  if (testProfile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(testProfile);
  if (testProfile === 'first_full') return Boolean(item.required_for_first_test);
  return !firstTestOnly;
}

const selectedModels = (models.models || []).filter((item) => matchesProfile(item));
const missingModelUrls = selectedModels.filter((item) =>
  !item.source_url
  && !item.source_url_env
  && !item.source_url_parts
  && !item.source_url_parts_env
  && !item.git_clone_url
);
const selectedNodes = (nodes.nodes || []).filter((item) => matchesProfile(item));
const missingNodeRepos = selectedNodes.filter((item) => !item.repo_url);

const result = {
  ok: true,
  mode,
  test_profile: testProfile,
  bundle: manifest.bundle,
  version: manifest.version,
  first_test_only: firstTestOnly,
  selected_model_count: selectedModels.length,
  missing_model_source_count: missingModelUrls.length,
  selected_custom_node_count: selectedNodes.length,
  missing_custom_node_repo_count: missingNodeRepos.length,
  missing_model_sources: missingModelUrls.map((item) => item.name),
  missing_custom_node_repos: missingNodeRepos.map((item) => item.name),
};

if (mode === 'real' && (missingModelUrls.length || missingNodeRepos.length)) {
  result.ok = false;
  result.reason = 'missing_download_sources';
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(31);
