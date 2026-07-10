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
function matchesProfile(item) {
  if (testProfile === 'api_smoke') return false;
  if (Array.isArray(item.test_profiles) && item.test_profiles.includes(testProfile)) return true;
  if (firstTestOnly) return Boolean(item.required_for_first_test);
  return true;
}

const nodes = (manifest.nodes || []).filter((item) => matchesProfile(item));
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
      '    if array.ndim == 2:',
      '        array = np.repeat(array[..., None], 3, axis=2)',
      '    if array.ndim == 3 and array.shape[0] in (1, 3, 4) and array.shape[-1] not in (1, 3, 4):',
      '        array = np.moveaxis(array, 0, -1)',
      '    if array.ndim == 3 and array.shape[-1] == 1:',
      '        array = np.repeat(array, 3, axis=2)',
      '    if array.ndim != 3 or array.shape[-1] not in (3, 4):',
      '        raise ValueError(f"Invalid IMAGE tensor shape after conversion: {array.shape}")',
      '    if array.shape[-1] == 4:',
      '        array = array[..., :3]',
      '    return np.clip(array * 255, 0, 255).astype(np.uint8)',
      ''
    ].join('\n'),
    'tensor_to_numpy',
  );

  replaceRequired(
    /def resize_image\(image: np\.ndarray, dimensions: Tuple\[int, int\]\) -> np\.ndarray:\r?\n    """Resize an image to the given dimensions using linear interpolation\."""\r?\n    return cv2\.resize\(image, dimensions, interpolation=cv2\.INTER_LINEAR\)\r?\n/s,
    [
      'def normalize_dimensions(dimensions) -> Tuple[int, int]:',
      '    """Normalize PIL/torch/numpy/list resize dimensions to an OpenCV dsize tuple."""',
      '    # fanvue-runtime-clipseg-compat',
      '    if hasattr(dimensions, "detach"):',
      '        dimensions = dimensions.detach().cpu().numpy()',
      '    if hasattr(dimensions, "tolist"):',
      '        dimensions = dimensions.tolist()',
      '    if isinstance(dimensions, (int, float, np.integer, np.floating)):',
      '        raise ValueError(f"Resize dimensions must contain width and height, got scalar: {dimensions}")',
      '    values = list(dimensions)',
      '    if len(values) < 2:',
      '        raise ValueError(f"Resize dimensions must contain width and height, got: {dimensions}")',
      '    width, height = values[0], values[1]',
      '    width = int(width.item() if hasattr(width, "item") else width)',
      '    height = int(height.item() if hasattr(height, "item") else height)',
      '    if width <= 0 or height <= 0:',
      '        raise ValueError(f"Invalid resize dimensions: {(width, height)}")',
      '    return width, height',
      '',
      'def image_dimensions(image: np.ndarray) -> Tuple[int, int]:',
      '    """Return OpenCV resize dimensions from a numpy image in width, height order."""',
      '    # fanvue-runtime-clipseg-compat',
      '    if image.ndim < 2:',
      '        raise ValueError(f"Invalid image shape for dimensions: {image.shape}")',
      '    height, width = image.shape[:2]',
      '    if width <= 0 or height <= 0:',
      '        raise ValueError(f"Invalid image dimensions from shape: {image.shape}")',
      '    return int(width), int(height)',
      '',
      'def resize_image(image: np.ndarray, dimensions: Tuple[int, int]) -> np.ndarray:',
      '    """Resize an image to the given dimensions using linear interpolation."""',
      '    # fanvue-runtime-clipseg-compat',
      '    width, height = normalize_dimensions(dimensions)',
      '    return cv2.resize(image, (width, height), interpolation=cv2.INTER_LINEAR)',
      '',
      'def safe_resize_image(image: np.ndarray, dimensions: Tuple[int, int], channels: int = 3) -> np.ndarray:',
      '    """Resize an image, falling back to a blank image if CLIPSeg produced an empty overlay."""',
      '    # fanvue-runtime-clipseg-compat',
      '    width, height = normalize_dimensions(dimensions)',
      '    if image is None or getattr(image, "size", 0) == 0:',
      '        return np.zeros((height, width, channels), dtype=np.uint8)',
      '    try:',
      '        resized = cv2.resize(image, (width, height), interpolation=cv2.INTER_LINEAR)',
      '    except cv2.error:',
      '        return np.zeros((height, width, channels), dtype=np.uint8)',
      '    if resized.ndim == 2:',
      '        resized = np.repeat(resized[..., None], channels, axis=2)',
      '    if resized.ndim == 3 and resized.shape[-1] > channels:',
      '        resized = resized[..., :channels]',
      '    return resized.astype(np.uint8, copy=False)',
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
    /        # Overlay the heatmap and binary mask on the original image\r?\n        dimensions = \(image_np\.shape\[1\], image_np\.shape\[0\]\)\r?\n/s,
    [
      '        # Overlay the heatmap and binary mask on the original image',
      '        dimensions = image_dimensions(image_np)',
      ''
    ].join('\n'),
    'segment_image.dimensions',
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

  replaceRequired(
    /        heatmap_resized = resize_image\(heatmap, dimensions\)\r?\n        binary_mask_resized = resize_image\(binary_mask, dimensions\)\r?\n/s,
    [
      '        heatmap_resized = safe_resize_image(heatmap, dimensions)',
      '        binary_mask_resized = safe_resize_image(binary_mask, dimensions)',
      ''
    ].join('\n'),
    'segment_image.safe_resize',
  );

  if (!content.includes('fanvue-runtime-clipseg-compat')) {
    throw new Error('CLIPSeg compatibility patch marker missing');
  }
  for (const requiredSnippet of [
    'def normalize_dimensions(dimensions) -> Tuple[int, int]:',
    'def image_dimensions(image: np.ndarray) -> Tuple[int, int]:',
    'def safe_resize_image(image: np.ndarray, dimensions: Tuple[int, int], channels: int = 3) -> np.ndarray:',
    'dimensions = image_dimensions(image_np)',
    'heatmap_resized = safe_resize_image(heatmap, dimensions)',
    'width, height = normalize_dimensions(dimensions)',
  ]) {
    if (!content.includes(requiredSnippet)) {
      throw new Error(`CLIPSeg compatibility patch missing snippet: ${requiredSnippet}`);
    }
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
