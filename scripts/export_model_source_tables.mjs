#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const manifestPath = path.join(root, 'models_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function csvCell(value) {
  if (value === undefined || value === null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function modelRow(model) {
  return [
    model.name,
    model.type,
    model.target_dir,
    model.required_for_first_test ? 'yes' : 'no',
    model.test_profiles ?? [],
    model.expected_bytes ?? '',
    model.min_bytes ?? '',
    model.sha256 ?? '',
    model.source_url ?? '',
  ].map(csvCell).join(',');
}

function writeCsv(fileName, models) {
  const header = [
    'name',
    'type',
    'target_dir',
    'required_for_first_test',
    'test_profiles',
    'expected_bytes',
    'min_bytes',
    'sha256',
    'source_url',
  ].join(',');

  fs.writeFileSync(path.join(root, fileName), [header, ...models.map(modelRow), ''].join('\n'));
}

const models = manifest.models ?? [];
const accessible = models.filter((model) => model.source_url);
const missing = models.filter((model) => !model.source_url);
const firstFullMissing = missing
  .filter((model) => model.required_for_first_test || (model.test_profiles ?? []).includes('first_full'))
  .map((model) => model.name);

writeCsv('model_sources_accessible.csv', accessible);
writeCsv('model_sources_missing.csv', missing);

console.log(JSON.stringify({
  total: models.length,
  accessible: accessible.length,
  missing: missing.length,
  first_full_missing_count: firstFullMissing.length,
  first_full_missing: firstFullMissing,
}, null, 2));
