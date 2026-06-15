#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const profile = process.env.FANVUE_TEST_PROFILE || process.argv[3] || 'first_full';
const strict = process.argv.includes('--strict');
const timeoutMs = Number(process.env.FANVUE_VERIFY_TIMEOUT_MS || 30000);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'models_manifest.json'), 'utf8'));

function matchesProfile(item) {
  if (profile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(profile);
  if (profile === 'first_full') return Boolean(item.required_for_first_test);
  return false;
}

function expectedBytes(item) {
  const value = Number(item.expected_bytes || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function minBytes(item) {
  const value = Number(item.min_bytes || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function checkUrl(item) {
  if (!item.source_url) {
    return { name: item.name, ok: false, status: 'missing_source_url' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(item.source_url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get('content-length') || 0);
    const expected = expectedBytes(item);
    const minimum = minBytes(item);
    const result = {
      name: item.name,
      ok: response.ok,
      status: response.ok ? 'reachable' : 'http_error',
      http_status: response.status,
      content_length: contentLength || undefined,
      expected_bytes: expected || undefined,
      min_bytes: minimum || undefined,
      source_url: item.source_url,
    };
    if (response.ok && expected && contentLength && contentLength !== expected) {
      result.ok = false;
      result.status = 'expected_bytes_mismatch';
    }
    if (response.ok && minimum && contentLength && contentLength < minimum) {
      result.ok = false;
      result.status = 'min_bytes_mismatch';
    }
    return result;
  } catch (error) {
    return {
      name: item.name,
      ok: false,
      status: error.name === 'AbortError' ? 'timeout' : 'request_failed',
      error: error.message,
      source_url: item.source_url,
    };
  } finally {
    clearTimeout(timer);
  }
}

const selectedModels = (manifest.models || []).filter((item) => matchesProfile(item));
const results = [];
for (const item of selectedModels) {
  results.push(await checkUrl(item));
}

const report = {
  ok: results.every((item) => item.ok || (!strict && item.status === 'missing_source_url')),
  strict,
  test_profile: profile,
  selected_model_count: selectedModels.length,
  failed_count: results.filter((item) => !item.ok).length,
  results,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(42);
