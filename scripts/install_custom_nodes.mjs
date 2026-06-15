import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const comfyDir = process.env.COMFY_DIR || '/workspace/ComfyUI';
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const testProfile = process.env.FANVUE_TEST_PROFILE || (firstTestOnly ? 'smoke' : 'all');
const dryRun = process.env.FANVUE_NODE_INSTALL_DRY_RUN === 'true';
const skipAllRequirements = process.env.FANVUE_NODE_SKIP_REQUIREMENTS === 'true';

const manifest = JSON.parse(fs.readFileSync(path.join(bundleDir, 'custom_nodes_manifest.json'), 'utf8'));
const nodes = (manifest.nodes || []).filter((item) =>
  testProfile === 'api_smoke' ? false :
  firstTestOnly ? item.required_for_first_test : true
);
const customNodesDir = path.join(comfyDir, 'custom_nodes');
fs.mkdirSync(customNodesDir, { recursive: true });

function patchClipSegCompat(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  function replaceRequired(regex, replacement, label) {
    const next = content.replace(regex, replacement);
    if (next === content) {
      throw new Error(`CLIPSeg compatibility patch failed at ${label}`);
    }
    content = next;
  }

  replaceRequired(
    /def tensor_to_numpy\(tensor: torch\.Tensor\) -> np\.ndarray:\r?\n    """Convert a tensor to a numpy array and scale its values to 0-255\."""\r?\n    array = tensor\.numpy\(\)\.squeeze\(\)\r?\n    return \(array \* 255\)\.astype\(np\.uint8\)\r?\n/s,
    [
      'def tensor_to_numpy(tensor: torch.Tensor) -> np.ndarray:',
      '    """Convert a ComfyUI IMAGE tensor to a numpy array and scale values to 0-255."""',
      '    # fanvue-runtime-clipseg-compat',
      '    array = tensor.detach().cpu().numpy()',
      '    if array.ndim == 4:',
      '        array = array[0]',
      '    array = np.squeeze(array)',
      '    return np.clip(array * 255, 0, 255).astype(np.uint8)',
      ''
    ].join('\n'),
    'tensor_to_numpy',
  );

  replaceRequired(
    /def resize_image\(image: np\.ndarray, dimensions: Tuple\[int, int\]\) -> np\.ndarray:\r?\n    """Resize an image to the given dimensions using linear interpolation\."""\r?\n    return cv2\.resize\(image, dimensions, interpolation=cv2\.INTER_LINEAR\)\r?\n/s,
    [
      'def resize_image(image: np.ndarray, dimensions: Tuple[int, int]) -> np.ndarray:',
      '    """Resize an image to the given dimensions using linear interpolation."""',
      '    # fanvue-runtime-clipseg-compat',
      '    width, height = dimensions',
      '    width = int(width.item() if hasattr(width, "item") else width)',
      '    height = int(height.item() if hasattr(height, "item") else height)',
      '    if width <= 0 or height <= 0:',
      '        raise ValueError(f"Invalid resize dimensions: {(width, height)}")',
      '    return cv2.resize(image, (width, height), interpolation=cv2.INTER_LINEAR)',
      ''
    ].join('\n'),
    'resize_image',
  );

  replaceRequired(
    /        # Convert the Tensor to a PIL image\r?\n        image_np = image\.numpy\(\)\.squeeze\(\).*?\r?\n        # Convert the numpy array back to the original range \(0-255\) and data type \(uint8\)\r?\n        image_np = \(image_np \* 255\)\.astype\(np\.uint8\)\r?\n/s,
    [
      '        # Convert the ComfyUI IMAGE tensor to a PIL-compatible numpy array.',
      '        image_np = tensor_to_numpy(image)',
      ''
    ].join('\n'),
    'segment_image.tensor_to_numpy',
  );

  replaceRequired(
    /        # Normalize the smoothed tensor to \[0, 1\]\r?\n        mask_normalized = \(tensor_smoothed - tensor_smoothed\.min\(\)\) \/ \(tensor_smoothed\.max\(\) - tensor_smoothed\.min\(\)\)\r?\n/s,
    [
      '        # Normalize the smoothed tensor to [0, 1]',
      '        mask_range = tensor_smoothed.max() - tensor_smoothed.min()',
      '        if float(mask_range) == 0:',
      '            mask_normalized = torch.zeros_like(tensor_smoothed)',
      '        else:',
      '            mask_normalized = (tensor_smoothed - tensor_smoothed.min()) / mask_range',
      ''
    ].join('\n'),
    'mask_normalization',
  );

  if (!content.includes('fanvue-runtime-clipseg-compat')) {
    throw new Error('CLIPSeg compatibility patch marker missing');
  }
  fs.writeFileSync(filePath, content);
}

const results = [];
for (const item of nodes) {
  const destination = path.join(customNodesDir, item.name);
  if (!item.repo_url) {
    results.push({ name: item.name, status: 'missing_repo_url' });
    continue;
  }
  if (fs.existsSync(destination)) {
    results.push({ name: item.name, status: 'already_exists', destination });
  } else if (dryRun) {
    results.push({ name: item.name, status: 'dry_run', destination, repo_url: item.repo_url });
  } else {
    const git = spawnSync('git', ['clone', '--depth', '1', item.repo_url, destination], { stdio: 'inherit' });
    results.push({ name: item.name, status: git.status === 0 ? 'cloned' : 'failed', destination });
    if (git.status !== 0) process.exit(git.status || 42);
  }

  const copiedFiles = [];
  for (const relativeFile of item.copy_files_to_custom_nodes || []) {
    const source = path.join(destination, relativeFile);
    const target = path.join(customNodesDir, path.basename(relativeFile));
    if (dryRun) {
      copiedFiles.push({ source, target, status: 'dry_run' });
      continue;
    }
    if (!fs.existsSync(source)) {
      console.error(`Missing custom node file for ${item.name}: ${source}`);
      process.exit(44);
    }
    fs.copyFileSync(source, target);
    if (item.patch_clipseg_compat && path.basename(relativeFile) === 'clipseg.py') {
      patchClipSegCompat(target);
    }
    copiedFiles.push({ source, target, status: 'copied' });
  }
  if (copiedFiles.length > 0) {
    results[results.length - 1].copied_files = copiedFiles;
  }

  const requirements = path.join(destination, 'requirements.txt');
  if (!dryRun && (item.skip_requirements || skipAllRequirements)) {
    results[results.length - 1].requirements = 'skipped';
  } else if (!dryRun && fs.existsSync(requirements)) {
    const pip = spawnSync('python3', ['-m', 'pip', 'install', '-r', requirements], { stdio: 'inherit' });
    if (pip.status !== 0) process.exit(pip.status || 43);
  }
}

console.log(JSON.stringify({ ok: true, custom_node_plan: results }, null, 2));
