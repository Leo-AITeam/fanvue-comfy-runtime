#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return '';
}

function config() {
  const url = env('SUPABASE_URL', 'FANVUE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY', 'FANVUE_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
  }
  return {
    url: url.replace(/\/+$/, ''),
    key,
  };
}

async function supabaseFetch(method, endpoint, body = undefined) {
  const { url, key } = config();
  const response = await fetch(`${url}${endpoint}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!response.ok) {
    const message = typeof parsed === 'object' && parsed?.message ? parsed.message : text;
    const error = new Error(`Supabase ${method} ${endpoint} failed: ${response.status} ${message}`);
    error.status = response.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function health() {
  const checks = [];
  for (const check of [
    {
      name: 'generation_jobs.table',
      request: () => supabaseFetch('GET', '/rest/v1/generation_jobs?select=id&limit=1'),
    },
    {
      name: 'generation_job_queue.view',
      request: () => supabaseFetch('GET', '/rest/v1/v_generation_job_queue_v1?select=job_id&limit=1'),
    },
    {
      name: 'generation_job_runtime_status.view',
      request: () => supabaseFetch('GET', '/rest/v1/v_generation_job_runtime_status_v1?select=job_id&limit=1'),
    },
  ]) {
    try {
      const data = await check.request();
      checks.push({ name: check.name, ok: true, rows: Array.isArray(data) ? data.length : null });
    } catch (error) {
      checks.push({
        name: check.name,
        ok: false,
        status: error.status || null,
        error: error.message,
        hint: check.name.includes('.view')
          ? 'Apply outputs/Fanvue_Generation_Job_Contract_Migration_2026-06-16.sql in Supabase.'
          : undefined,
      });
    }
  }
  const failed = checks.filter((check) => !check.ok);
  printJson({ ok: failed.length === 0, checks });
  if (failed.length) process.exit(1);
}

async function queue() {
  const limit = Number(argValue('limit', '5'));
  const rows = await supabaseFetch(
    'GET',
    `/rest/v1/v_generation_job_queue_v1?select=*&limit=${encodeURIComponent(String(limit))}`
  );
  printJson({ ok: true, count: rows.length, rows });
}

async function runtimeStatus() {
  const limit = Number(argValue('limit', '10'));
  const rows = await supabaseFetch(
    'GET',
    `/rest/v1/v_generation_job_runtime_status_v1?select=*&limit=${encodeURIComponent(String(limit))}`
  );
  printJson({ ok: true, count: rows.length, rows });
}

async function payload() {
  const jobId = argValue('job-id');
  if (!jobId) throw new Error('Missing --job-id.');
  const data = await supabaseFetch('POST', '/rest/v1/rpc/generation_job_payload_v1', {
    p_job_id: jobId,
  });
  printJson({ ok: true, job: data });
}

async function claim() {
  if (!hasFlag('confirm')) {
    printJson({
      ok: true,
      dry_run: true,
      would_call: 'claim_next_generation_job_v1()',
      warning: 'This mutates the next queued job. Re-run with --confirm only when a worker is ready.',
    });
    return;
  }
  const data = await supabaseFetch('POST', '/rest/v1/rpc/claim_next_generation_job_v1', {});
  printJson({ ok: true, result: data });
}

async function validatePayload() {
  const jobId = argValue('job-id');
  const file = argValue('file');
  const root = path.resolve(argValue('root', '.'));
  let job;

  if (file) {
    job = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  } else {
    if (!jobId) throw new Error('Missing --job-id or --file.');
    job = await supabaseFetch('POST', '/rest/v1/rpc/generation_job_payload_v1', {
      p_job_id: jobId,
    });
  }

  const outDir = path.join(root, 'tmp', 'supabase-generation-jobs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${job.job_id || 'payload'}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(job, null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    'scripts/validate_generation_job.mjs',
    root,
    outFile,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  printJson({
    ok: result.status === 0,
    payload_file: outFile,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function help() {
  printJson({
    usage: 'node scripts/supabase_generation_jobs.mjs <command>',
    env: [
      'SUPABASE_URL or FANVUE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY or FANVUE_SUPABASE_SERVICE_ROLE_KEY',
    ],
    commands: {
      health: 'Check table/view availability.',
      queue: 'Read v_generation_job_queue_v1 without mutating rows.',
      status: 'Read v_generation_job_runtime_status_v1.',
      payload: 'Build generation_job.v1 payload for --job-id.',
      'validate-payload': 'Validate Supabase payload for --job-id, or local --file.',
      claim: 'Dry-run by default; use --confirm to call claim_next_generation_job_v1().',
    },
  });
}

try {
  if (command === 'help' || command === '--help' || command === '-h') {
    help();
  } else if (command === 'health') {
    await health();
  } else if (command === 'queue') {
    await queue();
  } else if (command === 'status') {
    await runtimeStatus();
  } else if (command === 'payload') {
    await payload();
  } else if (command === 'validate-payload') {
    await validatePayload();
  } else if (command === 'claim') {
    await claim();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  printJson({
    ok: false,
    command,
    error: error.message,
    body: error.body || undefined,
  });
  process.exit(1);
}
