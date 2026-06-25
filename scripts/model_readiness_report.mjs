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
const photoLifestyle = profileRows('photo_lifestyle_v1');
const firstFull = profileRows('first_full');
const firstFullMissing = firstFull.filter((item) => !item.source_url);

function missingRows(rows) {
  if (!rows.length) return 'No missing first full model sources.';
  return rows
    .map((row) => `- \`${row.name}\` — source not verified yet.`)
    .join('\n');
}

const report = `# Runtime Model Readiness

Generated from \`models_manifest.json\`.

## Summary

| Profile | Selected models | Missing source_url |
|---|---:|---:|
| smoke | ${smoke.length} | ${smoke.filter((item) => !item.source_url).length} |
| face_detailer_smoke | ${faceDetailerSmoke.length} | ${faceDetailerSmoke.filter((item) => !item.source_url).length} |
| photo_lifestyle_v1 | ${photoLifestyle.length} | ${photoLifestyle.filter((item) => !item.source_url).length} |
| first_full | ${firstFull.length} | ${firstFullMissing.length} |

## Smoke Profile

This is the current safe GPU smoke profile.

${table(smoke)}

## Face Detailer Smoke Profile

This is the current safe GPU image-to-image profile for the Face Detailer adapter.

${table(faceDetailerSmoke)}

## Photo Lifestyle v1 Profile

This is the production realistic lifestyle still-image baseline.

${table(photoLifestyle)}

## First Full Profile

${firstFullMissing.length
  ? 'This profile remains blocked until every missing `source_url` is filled with a direct download URL.'
  : 'This profile is source-complete. It covers realistic lifestyle stills, adult-capable stills, identity/edit/detail, and controlled Wan 2.2 video smoke coverage.'}

Use these checks after future model changes:

\`\`\`bash
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/export_model_source_tables.mjs .
node scripts/validate_runtime_bundle.mjs .
\`\`\`

See \`docs/MISSING_MODEL_SOURCES.md\` for the legacy replacement table and import format.

### Remaining Source Gaps

${missingRows(firstFullMissing)}

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
