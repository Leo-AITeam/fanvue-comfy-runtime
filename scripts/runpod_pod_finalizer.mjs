#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0] || 'help';

function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return '';
}

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

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function config() {
  const supabaseUrl = env('SUPABASE_URL', 'FANVUE_SUPABASE_URL').replace(/\/+$/, '');
  const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY', 'FANVUE_SUPABASE_SERVICE_ROLE_KEY');
  const runpodKey = env('RUNPOD_API_KEY', 'FANVUE_RUNPOD_API_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if ((command === 'run' || command === 'stop-one') && !runpodKey) {
    throw new Error('Missing RUNPOD_API_KEY.');
  }
  return { supabaseUrl, supabaseKey, runpodKey };
}

async function supabaseFetch(method, endpoint, body = undefined) {
  const { supabaseUrl, supabaseKey } = config();
  const response = await fetch(`${supabaseUrl}${endpoint}`, {
    method,
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
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
      parsed = text.slice(0, 1000);
    }
  }
  if (!response.ok) {
    const message = parsed?.message || text.slice(0, 1000);
    const error = new Error(`Supabase ${method} ${endpoint} failed: ${response.status} ${message}`);
    error.status = response.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}

function summarizePodStopBody(body) {
  if (!body || typeof body !== 'object') return { body_type: typeof body };
  return {
    id: body.id || body.podId || null,
    name: body.name || null,
    desiredStatus: body.desiredStatus || null,
    status: body.status || null,
    machineId: body.machineId || null,
    gpuCount: body.gpuCount ?? null,
  };
}

async function runpodStopPod(podId) {
  const { runpodKey } = config();
  const response = await fetch(`https://rest.runpod.io/v1/pods/${encodeURIComponent(podId)}/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runpodKey}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }
  return {
    ok: response.ok,
    response_status: response.status,
    pod: summarizePodStopBody(body),
  };
}

async function listPending() {
  const limit = Math.max(1, Math.min(Number(argValue('limit', '20')), 100));
  const rows = await supabaseFetch(
    'GET',
    `/rest/v1/v_generation_pod_finalizer_v1?select=*&limit=${encodeURIComponent(String(limit))}`
  );
  return rows;
}

async function health() {
  const checks = [];
  for (const check of [
    {
      name: 'finalizer.view',
      request: () => supabaseFetch('GET', '/rest/v1/v_generation_pod_finalizer_v1?select=job_id&limit=1'),
    },
    {
      name: 'runtime_status.view',
      request: () => supabaseFetch('GET', '/rest/v1/v_generation_job_runtime_status_v1?select=job_id,worker_heartbeat_at,finalizer_stopped_at&limit=1'),
    },
    {
      name: 'mark_finalized.rpc',
      request: () => supabaseFetch('POST', '/rest/v1/rpc/mark_generation_pod_finalized_v1', {
        p_job_id: '00000000-0000-0000-0000-000000000000',
        p_pod_id: 'health-check',
        p_stop_result: { health_check: true },
      }),
      expectedStatus: 400,
    },
  ]) {
    try {
      const data = await check.request();
      checks.push({ name: check.name, ok: !check.expectedStatus, rows: Array.isArray(data) ? data.length : null });
    } catch (error) {
      checks.push({
        name: check.name,
        ok: error.status === check.expectedStatus,
        status: error.status || null,
        expected_status: check.expectedStatus || null,
        error: error.message,
      });
    }
  }
  const failed = checks.filter((check) => !check.ok);
  printJson({ ok: failed.length === 0, checks });
  if (failed.length) process.exit(1);
}

async function list() {
  const rows = await listPending();
  printJson({ ok: true, count: rows.length, rows });
}

async function recordSuccess(row, stopResult) {
  return supabaseFetch('POST', '/rest/v1/rpc/mark_generation_pod_finalized_v1', {
    p_job_id: row.job_id,
    p_pod_id: row.runpod_pod_id,
    p_stop_result: {
      ...stopResult,
      finalizer_reason: row.finalizer_reason || null,
      previous_status: row.status || null,
    },
  });
}

async function recordFailure(row, error, stopResult = {}) {
  return supabaseFetch('POST', '/rest/v1/rpc/mark_generation_pod_finalizer_failed_v1', {
    p_job_id: row.job_id,
    p_pod_id: row.runpod_pod_id,
    p_error: error.message || String(error),
    p_stop_result: {
      ...stopResult,
      finalizer_reason: row.finalizer_reason || null,
      previous_status: row.status || null,
    },
  });
}

async function run() {
  const dryRun = !hasFlag('confirm');
  const limit = Math.max(1, Math.min(Number(argValue('limit', '5')), 25));
  const rows = (await listPending()).slice(0, limit);
  const results = [];

  for (const row of rows) {
    const base = {
      job_id: row.job_id,
      pod_id: row.runpod_pod_id,
      status: row.status,
      reason: row.finalizer_reason,
      stop_policy: row.stop_policy,
    };
    if (dryRun) {
      results.push({ ...base, dry_run: true, would_stop: true });
      continue;
    }

    try {
      const stopResult = await runpodStopPod(row.runpod_pod_id);
      if (!stopResult.ok) {
        await recordFailure(row, new Error(`RunPod stop failed with HTTP ${stopResult.response_status}`), stopResult);
        results.push({ ...base, ok: false, stop: stopResult });
        continue;
      }
      const recorded = await recordSuccess(row, stopResult);
      results.push({ ...base, ok: true, stop: stopResult, recorded });
    } catch (error) {
      try {
        await recordFailure(row, error);
      } catch {
        // The original failure is more important for the operator output.
      }
      results.push({ ...base, ok: false, error: error.message });
    }
  }

  printJson({
    ok: results.every((item) => item.dry_run || item.ok),
    dry_run: dryRun,
    count: results.length,
    results,
  });
  if (results.some((item) => !item.dry_run && !item.ok)) process.exit(1);
}

async function stopOne() {
  const jobId = argValue('job-id');
  const podId = argValue('pod-id');
  if (!jobId || !podId) throw new Error('Missing --job-id and --pod-id.');
  const row = { job_id: jobId, runpod_pod_id: podId, status: 'manual', finalizer_reason: 'manual' };
  const stopResult = await runpodStopPod(podId);
  if (!stopResult.ok) {
    await recordFailure(row, new Error(`RunPod stop failed with HTTP ${stopResult.response_status}`), stopResult);
    printJson({ ok: false, job_id: jobId, pod_id: podId, stop: stopResult });
    process.exit(1);
  }
  const recorded = await recordSuccess(row, stopResult);
  printJson({ ok: true, job_id: jobId, pod_id: podId, stop: stopResult, recorded });
}

function help() {
  printJson({
    usage: 'node scripts/runpod_pod_finalizer.mjs <command>',
    env: [
      'SUPABASE_URL or FANVUE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY or FANVUE_SUPABASE_SERVICE_ROLE_KEY',
      'RUNPOD_API_KEY or FANVUE_RUNPOD_API_KEY for run/stop-one',
    ],
    commands: {
      health: 'Check finalizer DB objects.',
      list: 'List pods that should be stopped.',
      run: 'Dry-run by default; use --confirm to stop and mark pods.',
      'stop-one': 'Stop one explicit --job-id / --pod-id pair and mark it finalized.',
    },
  });
}

try {
  if (command === 'help' || command === '--help' || command === '-h') {
    help();
  } else if (command === 'health') {
    await health();
  } else if (command === 'list') {
    await list();
  } else if (command === 'run') {
    await run();
  } else if (command === 'stop-one') {
    await stopOne();
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
