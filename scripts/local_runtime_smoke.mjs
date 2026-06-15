#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || '.');
const outDir = path.join(root, 'tmp', 'local-runtime-smoke');
const node = process.execPath;

function run(name, commandArgs, options = {}) {
  const result = spawnSync(node, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
  return {
    name,
    ok: result.status === 0,
    exit_code: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

fs.mkdirSync(outDir, { recursive: true });

const workerRoot = path.join(outDir, 'worker');
const checks = [
  run('syntax.validate_runtime_bundle', ['--check', 'scripts/validate_runtime_bundle.mjs']),
  run('syntax.runpod_direct_test', ['--check', 'scripts/runpod_direct_test.mjs']),
  run('syntax.comfy_runtime_worker', ['--check', 'scripts/comfy_runtime_worker.mjs']),
  run('syntax.build_face_detailer_prompt', ['--check', 'scripts/build_face_detailer_prompt.mjs']),
  run('syntax.import_model_sources_csv', ['--check', 'scripts/import_model_sources_csv.mjs']),
  run('syntax.model_readiness_report', ['--check', 'scripts/model_readiness_report.mjs']),
  run('syntax.verify_model_sources', ['--check', 'scripts/verify_model_sources.mjs']),
  run('bundle.validate', ['scripts/validate_runtime_bundle.mjs']),
  run('model_sources.import_dry_run', [
    'scripts/import_model_sources_csv.mjs',
    '.',
    'model_sources_first_test_template.csv',
    '--dry-run',
  ]),
  run('model_readiness.report', [
    'scripts/model_readiness_report.mjs',
    '.',
    path.join(outDir, 'MODEL_READINESS.md'),
  ]),
  run('download_models.smoke_dry_run', ['scripts/download_models.mjs'], {
    env: {
      BUNDLE_DIR: root,
      WORKSPACE_DIR: path.join(outDir, 'download-smoke'),
      COMFY_DIR: path.join(outDir, 'download-smoke', 'ComfyUI'),
      FANVUE_TEST_PROFILE: 'smoke',
      FANVUE_DOWNLOAD_DRY_RUN: 'true',
      FANVUE_DOWNLOAD_REPORT: path.join(outDir, 'download-smoke-report.json'),
    },
  }),
  run('download_models.face_detailer_dry_run', ['scripts/download_models.mjs'], {
    env: {
      BUNDLE_DIR: root,
      WORKSPACE_DIR: path.join(outDir, 'download-face-detailer'),
      COMFY_DIR: path.join(outDir, 'download-face-detailer', 'ComfyUI'),
      FANVUE_TEST_PROFILE: 'face_detailer_smoke',
      FANVUE_DOWNLOAD_DRY_RUN: 'true',
      FANVUE_DOWNLOAD_REPORT: path.join(outDir, 'download-face-detailer-report.json'),
    },
  }),
  run('download_models.first_full_dry_run', ['scripts/download_models.mjs'], {
    env: {
      BUNDLE_DIR: root,
      WORKSPACE_DIR: path.join(outDir, 'download-first-full'),
      COMFY_DIR: path.join(outDir, 'download-first-full', 'ComfyUI'),
      FANVUE_TEST_PROFILE: 'first_full',
      FANVUE_DOWNLOAD_DRY_RUN: 'true',
      FANVUE_DOWNLOAD_REPORT: path.join(outDir, 'download-first-full-report.json'),
    },
  }),
  run('face_detailer.prompt_build', [
    'scripts/build_face_detailer_prompt.mjs',
    '--input-image',
    'fanvue/direct/source.png',
    '--output',
    path.join(outDir, 'face_detailer_prompt.json'),
    '--seed',
    '12345',
  ]),
  run('direct.create_dry_run', [
    'scripts/runpod_direct_test.mjs',
    'create',
    '--dry-run',
    '--profile',
    'smoke',
  ]),
  run('worker.face_detailer_dry_run', ['scripts/comfy_runtime_worker.mjs'], {
    env: {
      BUNDLE_DIR: root,
      FANVUE_DIR: path.join(workerRoot, 'fanvue'),
      COMFY_DIR: path.join(workerRoot, 'ComfyUI'),
      OUTPUT_DIR: path.join(workerRoot, 'fanvue', 'output'),
      FANVUE_WORKER_DRY_RUN: 'true',
      FANVUE_WORKFLOW_NAME: 'Face Detailer Smoke',
      FANVUE_INPUT_IMAGE_NAME: 'fanvue/direct/source.png',
      FANVUE_CALLBACK_URL: 'https://example.invalid/fanvue-generation-callback',
      FANVUE_CALLBACK_DRY_RUN: 'true',
      FANVUE_WORKER_REPORT: path.join(workerRoot, 'fanvue', 'fanvue_worker_report.json'),
      FANVUE_WORKER_REPORT_MIRROR: path.join(workerRoot, 'ComfyUI', 'output', 'fanvue_worker_report.json'),
    },
  }),
];

const failed = checks.filter((check) => !check.ok);
const report = {
  ok: failed.length === 0,
  root,
  out_dir: outDir,
  total: checks.length,
  failed: failed.length,
  checks,
};

const reportPath = path.join(outDir, 'local_runtime_smoke_report.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ok: report.ok,
  total: report.total,
  failed: report.failed,
  report: reportPath,
}, null, 2));

if (failed.length) process.exit(1);
