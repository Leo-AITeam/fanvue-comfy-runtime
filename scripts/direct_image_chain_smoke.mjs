#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const root = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
const node = process.execPath;
const direct = path.join(root, 'scripts', 'runpod_direct_test.mjs');

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

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function parseJson(stdout) {
  const text = stdout.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Could not parse command JSON: ${error.message}\n${text.slice(-1000)}`);
  }
}

function runDirect(label, commandArgs, options = {}) {
  console.error(`[direct-chain] ${label}`);
  const result = spawnSync(node, [direct, ...commandArgs], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
  if (result.status !== 0) {
    throw new Error(JSON.stringify({
      ok: false,
      step: label,
      exit_code: result.status,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    }, null, 2));
  }
  return parseJson(result.stdout);
}

function directArgs(command, extra = []) {
  const envFile = argValue('local-env-file', process.env.FANVUE_ENV_FILE || path.join(root, '.env.local'));
  const base = [command, '--local-env-file', envFile];
  if (hasFlag('skip-bundle-validate')) base.push('--skip-bundle-validate');
  return [...base, ...extra];
}

async function main() {
  if (!fs.existsSync(direct)) throw new Error(`Direct RunPod tester not found: ${direct}`);

  const dryRun = hasFlag('dry-run');
  const outDir = path.resolve(argValue('out-dir', path.join(root, 'direct-runpod-output', 'chain-smoke')));
  const reportPath = path.resolve(argValue('report', path.join(outDir, 'direct_image_chain_report.json')));
  const qwenPrompt = argValue('qwen-prompt', 'api_prompts/qwen_image_smoke.json');
  const qwenProfile = argValue('qwen-profile', 'qwen_edit_smoke');
  const qwenWorkflow = argValue('qwen-workflow-name', 'Qwen Image Edit Smoke');
  const qwenGpu = argValue('qwen-gpu', 'NVIDIA L40S');
  const qwenDisk = argValue('qwen-container-disk-gb', '120');
  const faceProfile = argValue('face-profile', 'face_detailer_smoke');
  const faceWorkflow = argValue('face-workflow-name', 'Face Detailer Smoke');
  const faceGpu = argValue('face-gpu', 'NVIDIA RTX 6000 Ada Generation');
  const faceDisk = argValue('face-container-disk-gb', '80');
  const faceSubfolder = argValue('face-input-subfolder', 'fanvue/direct-chain');
  const qwenTimeout = argValue('qwen-timeout-ms', '3600000');
  const faceTimeout = argValue('face-timeout-ms', '3600000');
  const historyTimeout = argValue('history-timeout-ms', '1800000');
  const sourceFile = argValue('source-file');

  fs.mkdirSync(outDir, { recursive: true });

  const report = {
    ok: false,
    dry_run: dryRun,
    out_dir: outDir,
    qwen: null,
    face_detailer: null,
    stopped_pods: [],
  };

  const activePods = [];
  try {
    if (dryRun) {
      report.qwen = {
        create: runDirect('qwen create dry-run', directArgs('create', [
          '--dry-run',
          '--profile', qwenProfile,
          '--workflow-name', qwenWorkflow,
          '--gpu', qwenGpu,
          '--container-disk-gb', qwenDisk,
        ])),
        submit: runDirect('qwen submit dry-run', directArgs('submit', [
          '--dry-run',
          '--prompt', qwenPrompt,
          '--save-prompt', path.join(outDir, 'qwen_prompt.json'),
        ])),
      };
      report.face_detailer = {
        create: runDirect('face detailer create dry-run', directArgs('create', [
          '--dry-run',
          '--profile', faceProfile,
          '--workflow-name', faceWorkflow,
          '--gpu', faceGpu,
          '--container-disk-gb', faceDisk,
        ])),
        submit: runDirect('face detailer submit dry-run', directArgs('submit', [
          '--dry-run',
          '--input-image', sourceFile || 'fanvue/direct-chain/source.png',
          '--save-prompt', path.join(outDir, 'face_detailer_prompt.json'),
          '--filename-prefix', 'fanvue_direct_chain_face_detailer',
        ])),
      };
      report.ok = true;
      writeJson(reportPath, report);
      console.log(JSON.stringify({ ok: true, status: 'direct_chain_dry_run_ready', report: reportPath }, null, 2));
      return;
    }

    let qwenOutput = sourceFile;
    if (!qwenOutput) {
      const create = runDirect('qwen create pod', directArgs('create', [
        '--profile', qwenProfile,
        '--workflow-name', qwenWorkflow,
        '--gpu', qwenGpu,
        '--container-disk-gb', qwenDisk,
      ]));
      const qwenPodId = create.pod_id;
      if (!qwenPodId) throw new Error('Qwen pod id missing from create response');
      activePods.push(qwenPodId);

      const wait = runDirect('qwen wait comfyui', directArgs('wait', [
        '--pod-id', qwenPodId,
        '--timeout-ms', qwenTimeout,
        '--interval-ms', '15000',
      ]));
      const submit = runDirect('qwen submit prompt', directArgs('submit', [
        '--pod-id', qwenPodId,
        '--prompt', qwenPrompt,
        '--save-prompt', path.join(outDir, 'qwen_prompt_submitted.json'),
      ]));
      const promptId = submit.response?.prompt_id;
      if (!promptId) throw new Error('Qwen prompt id missing from submit response');
      const history = runDirect('qwen wait history', directArgs('history', [
        '--pod-id', qwenPodId,
        '--prompt-id', promptId,
        '--out-dir', outDir,
        '--timeout-ms', historyTimeout,
        '--interval-ms', '10000',
      ]));
      qwenOutput = history.saved_files?.[0];
      if (!qwenOutput) throw new Error('Qwen output file missing from history response');
      report.qwen = { create, wait, submit, history, output_file: qwenOutput };
      const qwenStop = runDirect(`stop qwen pod ${qwenPodId}`, directArgs('stop', ['--pod-id', qwenPodId]));
      report.qwen.stop = qwenStop;
      report.stopped_pods.push({ pod_id: qwenPodId, ok: true, response: qwenStop });
      activePods.splice(activePods.indexOf(qwenPodId), 1);
    } else {
      report.qwen = { skipped: true, source_file: qwenOutput };
    }

    const faceCreate = runDirect('face detailer create pod', directArgs('create', [
      '--profile', faceProfile,
      '--workflow-name', faceWorkflow,
      '--gpu', faceGpu,
      '--container-disk-gb', faceDisk,
    ]));
    const facePodId = faceCreate.pod_id;
    if (!facePodId) throw new Error('Face Detailer pod id missing from create response');
    activePods.push(facePodId);

    const faceWait = runDirect('face detailer wait comfyui', directArgs('wait', [
      '--pod-id', facePodId,
      '--timeout-ms', faceTimeout,
      '--interval-ms', '15000',
    ]));
    const faceSubmit = runDirect('face detailer submit prompt', directArgs('submit', [
      '--pod-id', facePodId,
      '--input-file', qwenOutput,
      '--input-subfolder', faceSubfolder,
      '--save-prompt', path.join(outDir, 'face_detailer_prompt_submitted.json'),
      '--filename-prefix', 'fanvue_direct_chain_face_detailer',
    ]));
    const facePromptId = faceSubmit.response?.prompt_id;
    if (!facePromptId) throw new Error('Face Detailer prompt id missing from submit response');
    const faceHistory = runDirect('face detailer wait history', directArgs('history', [
      '--pod-id', facePodId,
      '--prompt-id', facePromptId,
      '--out-dir', outDir,
      '--timeout-ms', historyTimeout,
      '--interval-ms', '10000',
    ]));
    report.face_detailer = {
      create: faceCreate,
      wait: faceWait,
      submit: faceSubmit,
      history: faceHistory,
      output_file: faceHistory.saved_files?.[0] || null,
    };
    report.ok = true;
    writeJson(reportPath, report);
    console.log(JSON.stringify({
      ok: true,
      status: 'direct_image_chain_completed',
      qwen_output: qwenOutput,
      face_detailer_output: report.face_detailer.output_file,
      report: reportPath,
    }, null, 2));
  } finally {
    for (const podId of activePods.reverse()) {
      try {
        const stopped = runDirect(`stop pod ${podId}`, directArgs('stop', ['--pod-id', podId]));
        report.stopped_pods.push({ pod_id: podId, ok: true, response: stopped });
      } catch (error) {
        report.stopped_pods.push({ pod_id: podId, ok: false, error: error.message });
      }
    }
    writeJson(reportPath, report);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
