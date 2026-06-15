#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const outputPath = process.argv[3] || '';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'models_manifest.json'), 'utf8'));

function matchesProfile(item, profile) {
  if (profile === 'api_smoke') return false;
  if (profile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(profile);
  if (profile === 'first_full') return Boolean(item.required_for_first_test);
  return false;
}

function profileRows(profile) {
  return (manifest.models || [])
    .filter((item) => matchesProfile(item, profile))
    .map((item) => ({
      name: item.name,
      type: item.type || '',
      target_dir: item.target_dir || '',
      source_url_status: item.source_url ? 'ready' : 'missing',
      source_url: item.source_url || '',
    }));
}

function table(rows) {
  const lines = [
    '| # | File | Type | Target dir | Source URL |',
    '|---:|---|---|---|---|',
  ];
  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | \`${row.name}\` | ${row.type} | \`${row.target_dir}\` | ${row.source_url_status} |`);
  });
  return lines.join('\n');
}

const smoke = profileRows('smoke');
const faceDetailerSmoke = profileRows('face_detailer_smoke');
const firstFull = profileRows('first_full');
const report = `# Runtime Model Readiness

Generated from \`models_manifest.json\`.

## Summary

| Profile | Selected models | Missing source_url |
|---|---:|---:|
| smoke | ${smoke.length} | ${smoke.filter((item) => !item.source_url).length} |
| face_detailer_smoke | ${faceDetailerSmoke.length} | ${faceDetailerSmoke.filter((item) => !item.source_url).length} |
| first_full | ${firstFull.length} | ${firstFull.filter((item) => !item.source_url).length} |

## Smoke Profile

This is the current safe GPU smoke profile.

${table(smoke)}

## Face Detailer Smoke Profile

This is the current safe GPU image-to-image profile for the Face Detailer adapter.

${table(faceDetailerSmoke)}

## First Full Profile

This profile remains blocked until every missing \`source_url\` is filled with a direct download URL.

${table(firstFull)}
`;

if (outputPath) {
  const resolved = path.isAbsolute(outputPath) ? outputPath : path.join(root, outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, report);
  console.log(JSON.stringify({
    ok: true,
    output: resolved,
    smoke_count: smoke.length,
    face_detailer_smoke_count: faceDetailerSmoke.length,
    first_full_count: firstFull.length,
  }, null, 2));
} else {
  console.log(report);
}
