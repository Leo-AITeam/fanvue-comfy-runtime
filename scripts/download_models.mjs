import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const testProfile = process.env.FANVUE_TEST_PROFILE || (firstTestOnly ? 'smoke' : 'all');
const dryRun = process.env.FANVUE_DOWNLOAD_DRY_RUN === 'true';
const reportPath = process.env.FANVUE_DOWNLOAD_REPORT || path.join(workspaceDir, 'fanvue', 'download_models_report.json');
const mirrorReportPath = process.env.FANVUE_DOWNLOAD_REPORT_MIRROR || '';

const manifestPath = path.join(bundleDir, 'models_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
function matchesProfile(item) {
  if (testProfile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(testProfile);
  if (testProfile === 'first_full') return Boolean(item.required_for_first_test);
  return !firstTestOnly;
}

const models = (manifest.models || []).filter((item) => matchesProfile(item));

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
    const stat = fs.statSync(destination);
    results.push({ name: item.name, status: 'already_exists', destination, bytes: stat.size });
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
    bytes: curl.status === 0 && fs.existsSync(destination) ? fs.statSync(destination).size : 0,
  });
  if (curl.status !== 0) process.exit(curl.status || 41);
}

const report = {
  ok: results.every((item) => !['failed'].includes(item.status)),
  generated_at: new Date().toISOString(),
  workspace_dir: workspaceDir,
  test_profile: testProfile,
  first_test_only: firstTestOnly,
  selected_model_count: models.length,
  downloaded_plan: results,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
if (mirrorReportPath) {
  fs.mkdirSync(path.dirname(mirrorReportPath), { recursive: true });
  fs.writeFileSync(mirrorReportPath, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
