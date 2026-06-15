#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = path.resolve(args[0] || '.');
const csvPath = args[1] ? path.resolve(args[1]) : path.join(root, 'model_sources_first_test_template.csv');
const dryRun = args.includes('--dry-run');
const strict = args.includes('--strict');

function usage() {
  console.error(`Usage: node scripts/import_model_sources_csv.mjs ROOT CSV [--dry-run] [--strict]

Required CSV columns:
  name,source_url

Optional CSV columns:
  expected_bytes,min_bytes

By default, empty source_url rows are ignored.
Use --strict to fail when first_full rows remain without source_url after import.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (quoted) throw new Error('CSV has an unclosed quoted value');
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item.trim()));
}

function toObjects(rows) {
  if (!rows.length) throw new Error('CSV is empty');
  const header = rows[0].map((item) => item.trim());
  for (const column of ['name', 'source_url']) {
    if (!header.includes(column)) throw new Error(`CSV is missing required column: ${column}`);
  }

  return rows.slice(1).map((items, index) => {
    const object = { __line: index + 2 };
    header.forEach((column, columnIndex) => {
      object[column] = String(items[columnIndex] || '').trim();
    });
    return object;
  });
}

function numberOrUndefined(value, field, line) {
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Invalid ${field} at CSV line ${line}: ${value}`);
  }
  return number;
}

if (!fs.existsSync(csvPath)) {
  usage();
  throw new Error(`CSV file not found: ${csvPath}`);
}

const manifestPath = path.join(root, 'models_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const models = manifest.models || [];
const byName = new Map(models.map((item) => [item.name, item]));
const csvRows = toObjects(parseCsv(fs.readFileSync(csvPath, 'utf8')));

const seen = new Set();
const unknown = [];
const duplicate = [];
const empty = [];
const updates = [];

for (const row of csvRows) {
  if (!row.name) continue;
  if (seen.has(row.name)) {
    duplicate.push({ name: row.name, line: row.__line });
    continue;
  }
  seen.add(row.name);

  const model = byName.get(row.name);
  if (!model) {
    unknown.push({ name: row.name, line: row.__line });
    continue;
  }

  if (!row.source_url) {
    empty.push({ name: row.name, line: row.__line });
    continue;
  }

  const expectedBytes = numberOrUndefined(row.expected_bytes, 'expected_bytes', row.__line);
  const minBytes = numberOrUndefined(row.min_bytes, 'min_bytes', row.__line);
  const before = {
    source_url: model.source_url || '',
    expected_bytes: model.expected_bytes,
    min_bytes: model.min_bytes,
  };

  updates.push({
    name: row.name,
    line: row.__line,
    source_url: row.source_url,
    expected_bytes: expectedBytes,
    min_bytes: minBytes,
    before,
  });

  if (!dryRun) {
    model.source_url = row.source_url;
    if (expectedBytes !== undefined) {
      model.expected_bytes = expectedBytes;
      delete model.min_bytes;
    } else if (minBytes !== undefined) {
      model.min_bytes = minBytes;
      delete model.expected_bytes;
    }
  }
}

const firstFullMissing = models
  .filter((item) => Boolean(item.required_for_first_test))
  .filter((item) => !item.source_url)
  .map((item) => item.name);

const errors = [];
if (unknown.length) errors.push('unknown_model_names');
if (duplicate.length) errors.push('duplicate_model_names');
if (strict && firstFullMissing.length) errors.push('first_full_sources_still_missing');

if (!dryRun && !errors.length) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const report = {
  ok: errors.length === 0,
  dry_run: dryRun,
  strict,
  csv: csvPath,
  manifest: manifestPath,
  update_count: updates.length,
  empty_source_url_count: empty.length,
  unknown,
  duplicate,
  first_full_missing_count: firstFullMissing.length,
  first_full_missing: firstFullMissing,
  updates,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
