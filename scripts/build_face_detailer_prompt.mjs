import fs from 'node:fs';
import path from 'node:path';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const templatePath = argValue(
  'template',
  path.join(bundleDir, 'api_prompts', 'face_detailer_smoke_template.json')
);
const outputPath = argValue('output', '');
const inputImage = argValue('input-image', process.env.FANVUE_INPUT_IMAGE || '');
const filenamePrefix = argValue(
  'filename-prefix',
  process.env.FANVUE_FACE_DETAILER_PREFIX || 'fanvue_face_detailer_smoke'
);
const seedArg = argValue('seed', process.env.FANVUE_SEED || '');
const seed = seedArg ? Number(seedArg) : Math.floor(Math.random() * 1_000_000_000_000_000);

if (!inputImage) {
  console.error(JSON.stringify({
    ok: false,
    status: 'missing_input_image',
    message: 'Pass --input-image or FANVUE_INPUT_IMAGE. This value must match the ComfyUI LoadImage input filename.'
  }, null, 2));
  process.exit(31);
}

const prompt = readJson(templatePath);

let replaced = 0;
for (const node of Object.values(prompt)) {
  if (!node || typeof node !== 'object' || !node.inputs) continue;
  for (const [key, value] of Object.entries(node.inputs)) {
    if (value === '__INPUT_IMAGE__') {
      node.inputs[key] = inputImage;
      replaced += 1;
    }
  }
}

if (prompt['9']?.inputs) prompt['9'].inputs.seed = seed;
if (prompt['10']?.inputs) prompt['10'].inputs.filename_prefix = filenamePrefix;

const result = {
  ok: replaced > 0,
  status: replaced > 0 ? 'face_detailer_prompt_ready' : 'placeholder_not_found',
  template: templatePath,
  input_image: inputImage,
  filename_prefix: filenamePrefix,
  seed,
  replaced,
  prompt
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(32);
}

if (outputPath) {
  writeJson(outputPath, prompt);
  console.log(JSON.stringify({
    ok: true,
    status: result.status,
    output: outputPath,
    input_image: inputImage,
    filename_prefix: filenamePrefix,
    seed,
    replaced
  }, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
