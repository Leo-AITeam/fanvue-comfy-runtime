import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const comfyDir = process.env.COMFY_DIR || '/workspace/ComfyUI';
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const testProfile = process.env.FANVUE_TEST_PROFILE || (firstTestOnly ? 'smoke' : 'all');
const dryRun = process.env.FANVUE_NODE_INSTALL_DRY_RUN === 'true';

const manifest = JSON.parse(fs.readFileSync(path.join(bundleDir, 'custom_nodes_manifest.json'), 'utf8'));
const nodes = (manifest.nodes || []).filter((item) =>
  testProfile === 'api_smoke' ? false :
  firstTestOnly ? item.required_for_first_test : true
);
const customNodesDir = path.join(comfyDir, 'custom_nodes');
fs.mkdirSync(customNodesDir, { recursive: true });

const results = [];
for (const item of nodes) {
  const destination = path.join(customNodesDir, item.name);
  if (!item.repo_url) {
    results.push({ name: item.name, status: 'missing_repo_url' });
    continue;
  }
  if (fs.existsSync(destination)) {
    results.push({ name: item.name, status: 'already_exists', destination });
  } else if (dryRun) {
    results.push({ name: item.name, status: 'dry_run', destination, repo_url: item.repo_url });
  } else {
    const git = spawnSync('git', ['clone', '--depth', '1', item.repo_url, destination], { stdio: 'inherit' });
    results.push({ name: item.name, status: git.status === 0 ? 'cloned' : 'failed', destination });
    if (git.status !== 0) process.exit(git.status || 42);
  }

  const requirements = path.join(destination, 'requirements.txt');
  if (!dryRun && fs.existsSync(requirements)) {
    const pip = spawnSync('python3', ['-m', 'pip', 'install', '-r', requirements], { stdio: 'inherit' });
    if (pip.status !== 0) process.exit(pip.status || 43);
  }
}

console.log(JSON.stringify({ ok: true, custom_node_plan: results }, null, 2));
