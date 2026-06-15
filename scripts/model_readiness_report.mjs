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
const firstFullMissing = firstFull.filter((item) => !item.source_url);
const knownSourceGaps = {
  'AIKOZIMAGE_000002700.safetensors': 'OFMTechNSFW++ checkpoint; source not verified yet.',
  'Detailed Nipples XL v1.0.safetensors': 'OFMTechNSFW++ LoRA; similar files exist with different filenames, source not verified yet.',
  'Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors': 'WAN2.2 text-to-video LoRA; searched candidate repo was empty.',
  'Wan22_A14B_T2V_LOW_Lightning_4steps_lora_250928_rank64_fp16.safetensors': 'WAN2.2 text-to-video LoRA; no verified direct source yet.',
  'wan2.2_t2v_highnoise_sidemissionary_v1.0.safetensors': 'WAN2.2 text-to-video checkpoint; no verified direct source yet.',
  'wan2.2_t2v_lownoise_sidemissionary_v1.0.safetensors': 'WAN2.2 text-to-video checkpoint; no verified direct source yet.',
};

function missingRows(rows) {
  if (!rows.length) return 'No missing first full model sources.';
  return rows
    .map((row) => `- \`${row.name}\` — ${knownSourceGaps[row.name] || 'source not verified yet.'}`)
    .join('\n');
}

const report = `# Runtime Model Readiness

Generated from \`models_manifest.json\`.

## Summary

| Profile | Selected models | Missing source_url |
|---|---:|---:|
| smoke | ${smoke.length} | ${smoke.filter((item) => !item.source_url).length} |
| face_detailer_smoke | ${faceDetailerSmoke.length} | ${faceDetailerSmoke.filter((item) => !item.source_url).length} |
| first_full | ${firstFull.length} | ${firstFullMissing.length} |

## Smoke Profile

This is the current safe GPU smoke profile.

${table(smoke)}

## Face Detailer Smoke Profile

This is the current safe GPU image-to-image profile for the Face Detailer adapter.

${table(faceDetailerSmoke)}

## First Full Profile

This profile remains blocked until every missing \`source_url\` is filled with a direct download URL.

Use the CSV importer to apply verified direct URLs safely:

\`\`\`bash
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --dry-run
node scripts/import_model_sources_csv.mjs . model_sources_first_test_template.csv --strict
node scripts/model_readiness_report.mjs . docs/MODEL_READINESS.md
node scripts/validate_runtime_bundle.mjs .
\`\`\`

The importer matches by exact model filename, reports unknown or duplicate rows,
and can fail in \`--strict\` mode until all \`first_full\` sources are filled.

Runtime preflight also fails \`FANVUE_TEST_PROFILE=first_full\` in real mode while
any selected model is missing a \`source_url\`. Use \`smoke\` or
\`face_detailer_smoke\` for safe GPU checks until the list below is empty.

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
