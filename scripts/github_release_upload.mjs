#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

async function githubFetch(url, options = {}) {
  const token = env('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 1000);
  }
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function ensureRelease() {
  const repo = env('FANVUE_GITHUB_OUTPUT_REPO', 'Leo-AITeam/fanvue-comfy-runtime');
  const tag = env('FANVUE_GITHUB_OUTPUT_TAG', 'anna-runtime-outputs');
  try {
    const release = await githubFetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);
    return { repo, release };
  } catch (error) {
    if (!String(error.message).includes('404')) throw error;
  }
  const release = await githubFetch(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      name: env('FANVUE_GITHUB_OUTPUT_RELEASE_NAME', 'Anna Runtime Outputs'),
      draft: false,
      prerelease: true,
    }),
  });
  return { repo, release };
}

async function main() {
  if (!['1', 'true', 'yes', 'y'].includes(env('FANVUE_GITHUB_OUTPUT_UPLOAD').toLowerCase())) {
    console.log(JSON.stringify({ ok: true, status: 'disabled' }));
    return;
  }
  const files = process.argv.slice(2).filter((file) => file && fs.existsSync(file) && fs.statSync(file).isFile());
  if (files.length === 0) {
    console.log(JSON.stringify({ ok: false, status: 'no_files' }));
    return;
  }
  const { release } = await ensureRelease();
  const uploadUrl = String(release.upload_url || '').replace(/\{\?name,label\}$/, '');
  const prefix = env('FANVUE_GITHUB_OUTPUT_NAME_PREFIX', 'fanvue_output');
  const uploaded = [];
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    const assetName = `${prefix}_${Date.now()}_${path.basename(file)}`.replace(/[^A-Za-z0-9._-]+/g, '_');
    const body = await githubFetch(`${uploadUrl}?name=${encodeURIComponent(assetName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    uploaded.push({
      file,
      asset_name: assetName,
      bytes: bytes.length,
      browser_download_url: body?.browser_download_url || null,
    });
  }
  console.log(JSON.stringify({ ok: true, status: 'uploaded', uploaded }, null, 2));
}

await main();
