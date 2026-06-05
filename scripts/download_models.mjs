import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const dryRun = process.env.FANVUE_DOWNLOAD_DRY_RUN === 'true';

const manifestPath = path.join(bundleDir, 'models_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const models = (manifest.models || []).filter((item) =>
  firstTestOnly ? item.required_for_first_test : true
);

function targetPath(item) {
  const cleanName = String(item.name).replaceAll('\\', '/');
  return path.join(workspaceDir, item.target_dir, cleanName);
}

const results = [];
for (const item of models) {
  const destination = targetPath(item);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (!item.source_url) {
    results.push({ name: item.name, status: 'missing_source_url', destination });
    continue;
  }
  if (fs.existsSync(destination)) {
    results.push({ name: item.name, status: 'already_exists', destination });
    continue;
  }
  if (dryRun) {
    results.push({ name: item.name, status: 'dry_run', destination, source_url: item.source_url });
    continue;
  }
  const curl = spawnSync('curl', ['-L', '--fail', '--retry', '3', '-o', destination, item.source_url], {
    stdio: 'inherit',
  });
  results.push({
    name: item.name,
    status: curl.status === 0 ? 'downloaded' : 'failed',
    destination,
  });
  if (curl.status !== 0) process.exit(curl.status || 41);
}

console.log(JSON.stringify({ ok: true, downloaded_plan: results }, null, 2));
