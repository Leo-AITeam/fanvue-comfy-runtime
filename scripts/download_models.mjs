import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bundleDir = process.env.BUNDLE_DIR || path.resolve('.');
const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';
const comfyDir = process.env.COMFY_DIR || path.join(workspaceDir, 'ComfyUI');
const firstTestOnly = process.env.FANVUE_FIRST_TEST_ONLY !== 'false';
const testProfile = process.env.FANVUE_TEST_PROFILE || (firstTestOnly ? 'smoke' : 'all');
const dryRun = process.env.FANVUE_DOWNLOAD_DRY_RUN === 'true';
const reportPath = process.env.FANVUE_DOWNLOAD_REPORT || path.join(workspaceDir, 'fanvue', 'download_models_report.json');
const mirrorReportPath = process.env.FANVUE_DOWNLOAD_REPORT_MIRROR || '';

const manifestPath = path.join(bundleDir, 'models_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
function matchesProfile(item) {
  if (testProfile === 'all') return true;
  if (Array.isArray(item.test_profiles)) return item.test_profiles.includes(testProfile);
  if (testProfile === 'first_full') return Boolean(item.required_for_first_test);
  return !firstTestOnly;
}

const models = (manifest.models || []).filter((item) => matchesProfile(item));
const results = [];

function writeReport(status = 'downloading', extra = {}) {
  const report = {
    ok: status === 'completed'
      ? results.every((item) => !['failed', 'existing_invalid_dry_run'].includes(item.status))
      : true,
    status,
    generated_at: new Date().toISOString(),
    workspace_dir: workspaceDir,
    comfy_dir: comfyDir,
    test_profile: testProfile,
    first_test_only: firstTestOnly,
    selected_model_count: models.length,
    completed_model_count: results.length,
    downloaded_plan: results,
    ...extra,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (mirrorReportPath) {
    fs.mkdirSync(path.dirname(mirrorReportPath), { recursive: true });
    fs.writeFileSync(mirrorReportPath, JSON.stringify(report, null, 2));
  }
  return report;
}

writeReport(dryRun ? 'dry_run_planning' : 'starting');

function expectedBytes(item) {
  const value = Number(item.expected_bytes || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function minBytes(item) {
  const value = Number(item.min_bytes || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function validateFileSize(item, destination) {
  if (!fs.existsSync(destination)) {
    return { ok: false, bytes: 0, reason: 'missing_file' };
  }
  const bytes = fs.statSync(destination).size;
  const expected = expectedBytes(item);
  if (expected && bytes !== expected) {
    return { ok: false, bytes, expected_bytes: expected, reason: 'expected_bytes_mismatch' };
  }
  const minimum = minBytes(item);
  if (minimum && bytes < minimum) {
    return { ok: false, bytes, min_bytes: minimum, reason: 'min_bytes_mismatch' };
  }
  return { ok: true, bytes, expected_bytes: expected || undefined, min_bytes: minimum || undefined };
}

function sourceUrl(item) {
  if (item.source_url_env) return process.env[item.source_url_env] || '';
  return item.source_url || '';
}

function sourceUrlParts(item) {
  if (item.source_url_parts_env && process.env[item.source_url_parts_env]) {
    return process.env[item.source_url_parts_env]
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (Array.isArray(item.source_url_parts)) return item.source_url_parts.filter(Boolean);
  return [];
}

function curlHeaderArgs(item) {
  const args = [];
  for (const header of item.headers || []) {
    const value = header.value_env ? process.env[header.value_env] : header.value;
    if (!header.name || !value) continue;
    args.push('-H', `${header.name}: ${header.prefix || ''}${value}`);
  }
  return args;
}

function targetPath(item) {
  const cleanName = String(item.name).replaceAll('\\', '/');
  const targetDir = String(item.target_dir || '').replaceAll('\\', '/');
  if (targetDir === 'ComfyUI') return path.join(comfyDir, cleanName);
  if (targetDir.startsWith('ComfyUI/')) {
    return path.join(comfyDir, targetDir.slice('ComfyUI/'.length), cleanName);
  }
  return path.join(workspaceDir, targetDir, cleanName);
}

function targetDirPath(targetDir) {
  const cleanTargetDir = String(targetDir || '').replaceAll('\\', '/');
  if (cleanTargetDir === 'ComfyUI') return comfyDir;
  if (cleanTargetDir.startsWith('ComfyUI/')) {
    return path.join(comfyDir, cleanTargetDir.slice('ComfyUI/'.length));
  }
  return path.join(workspaceDir, cleanTargetDir);
}

function extractDownloadedFile(item, destination) {
  if (!item.extract) return null;
  if (item.extract.type !== 'zip') {
    throw new Error(`Unsupported extract type for ${item.name}: ${item.extract.type}`);
  }
  const extractDestination = targetDirPath(item.extract.destination_dir || item.target_dir || '');
  fs.mkdirSync(extractDestination, { recursive: true });
  const unzip = spawnSync('unzip', ['-o', destination, '-d', extractDestination], { stdio: 'inherit' });
  if (unzip.status !== 0) {
    throw new Error(`Failed to extract ${item.name} to ${extractDestination}`);
  }
  if (item.extract.remove_archive && fs.existsSync(destination)) fs.unlinkSync(destination);
  return {
    type: item.extract.type,
    destination: extractDestination,
    archive_removed: Boolean(item.extract.remove_archive),
  };
}

function extractExpectedPaths(item) {
  if (!item.extract || !Array.isArray(item.extract.expected_files)) return [];
  const extractDestination = targetDirPath(item.extract.destination_dir || item.target_dir || '');
  return item.extract.expected_files.map((file) => path.join(extractDestination, String(file).replaceAll('\\', '/')));
}

function validateExtractedFiles(item) {
  const expectedPaths = extractExpectedPaths(item);
  if (expectedPaths.length === 0) return { ok: false, reason: 'no_extract_expected_files' };
  const missing = expectedPaths.filter((filePath) => !fs.existsSync(filePath));
  return {
    ok: missing.length === 0,
    expected_files: expectedPaths,
    missing_files: missing.length > 0 ? missing : undefined,
    reason: missing.length > 0 ? 'missing_extracted_files' : undefined,
  };
}

for (const item of models) {
  const destination = targetPath(item);
  const resolvedSourceUrl = sourceUrl(item);
  const resolvedSourceUrlParts = sourceUrlParts(item);
  const extractedStatus = validateExtractedFiles(item);
  if (item.extract && extractedStatus.ok && !fs.existsSync(destination)) {
    results.push({
      name: item.name,
      status: 'extracted_already_exists',
      destination,
      extract: {
        type: item.extract.type,
        destination: targetDirPath(item.extract.destination_dir || item.target_dir || ''),
        expected_files: extractedStatus.expected_files,
      },
    });
    writeReport('downloading', { current_model: { name: item.name, status: 'extracted_already_exists' } });
    continue;
  }
  if (!resolvedSourceUrl && resolvedSourceUrlParts.length === 0) {
    results.push({ name: item.name, status: 'missing_source_url', destination });
    writeReport('downloading', { current_model: { name: item.name, status: 'missing_source_url' } });
    continue;
  }
  if (fs.existsSync(destination)) {
    const validation = validateFileSize(item, destination);
    if (!validation.ok) {
      if (dryRun) {
        results.push({ name: item.name, status: 'existing_invalid_dry_run', destination, ...validation });
        writeReport('dry_run_planning', { current_model: { name: item.name, status: 'existing_invalid_dry_run' } });
        continue;
      }
      fs.unlinkSync(destination);
      results.push({ name: item.name, status: 'existing_invalid_removed', destination, ...validation });
      writeReport('downloading', { current_model: { name: item.name, status: 'existing_invalid_removed' } });
    } else {
      let extractResult = null;
      if (item.extract && !dryRun) {
        try {
          extractResult = extractDownloadedFile(item, destination);
        } catch (error) {
          results.push({
            name: item.name,
            status: 'extract_failed',
            destination,
            error: error.message,
            ...validation,
          });
          writeReport('failed', { current_model: { name: item.name, status: 'extract_failed' } });
          process.exit(42);
        }
      }
      results.push({ name: item.name, status: 'already_exists', destination, ...validation });
      if (extractResult) results[results.length - 1].extract = extractResult;
      writeReport('downloading', { current_model: { name: item.name, status: 'already_exists' } });
      continue;
    }
  }
  if (dryRun) {
    results.push({
      name: item.name,
      status: 'dry_run',
      destination,
      source_url: item.source_url ? item.source_url : undefined,
      source_url_env: item.source_url_env,
      source_url_parts_env: item.source_url_parts_env,
      source_url_parts_count: resolvedSourceUrlParts.length || undefined,
      decrypt: item.decrypt ? { ...item.decrypt, key_env: item.decrypt.key_env ? '[env]' : undefined } : undefined,
    });
    writeReport('dry_run_planning', { current_model: { name: item.name, status: 'dry_run' } });
    continue;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const encryptedDownload = Boolean(item.decrypt);
  const downloadDestination = encryptedDownload ? `${destination}.encrypted_download` : destination;
  const configuredAttempts = Number(process.env.FANVUE_DOWNLOAD_ATTEMPTS || 3);
  const maxAttempts = Number.isFinite(configuredAttempts) && configuredAttempts > 0 ? configuredAttempts : 3;
  let finalStatus = { ok: false, bytes: 0, reason: 'not_started' };
  let curlStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    writeReport('downloading', {
      current_model: {
        name: item.name,
        destination,
        attempt,
        max_attempts: maxAttempts,
        status: 'downloading',
      },
    });
    let curl = { status: 0 };
    if (resolvedSourceUrlParts.length > 0) {
      const partPaths = [];
      let partFailed = false;
      for (let index = 0; index < resolvedSourceUrlParts.length; index += 1) {
        const partPath = `${downloadDestination}.part${String(index + 1).padStart(3, '0')}`;
        partPaths.push(partPath);
        curl = spawnSync(
          'curl',
          [
            '-L',
            '--fail',
            '--retry',
            '3',
            '--retry-delay',
            '2',
            ...curlHeaderArgs(item),
            '-o',
            partPath,
            resolvedSourceUrlParts[index],
          ],
          { stdio: 'inherit' },
        );
        curlStatus = curl.status || 0;
        if (curl.status !== 0) {
          partFailed = true;
          break;
        }
      }
      if (!partFailed) {
        const out = fs.openSync(downloadDestination, 'w');
        try {
          for (const partPath of partPaths) {
            const input = fs.openSync(partPath, 'r');
            try {
              const buffer = Buffer.allocUnsafe(16 * 1024 * 1024);
              let bytesRead = 0;
              while ((bytesRead = fs.readSync(input, buffer, 0, buffer.length, null)) > 0) {
                fs.writeSync(out, buffer, 0, bytesRead);
              }
            } finally {
              fs.closeSync(input);
            }
          }
        } finally {
          fs.closeSync(out);
        }
      }
      for (const partPath of partPaths) {
        if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
      }
    } else {
      curl = spawnSync(
        'curl',
        [
          '-L',
          '--fail',
          '--retry',
          '3',
          '--retry-delay',
          '2',
          ...curlHeaderArgs(item),
          '-o',
          downloadDestination,
          resolvedSourceUrl,
        ],
        { stdio: 'inherit' },
      );
      curlStatus = curl.status || 0;
    }
    if (curl.status !== 0) {
      finalStatus = { ok: false, bytes: 0, reason: 'curl_failed', attempt, curl_status: curl.status };
      if (fs.existsSync(downloadDestination)) fs.unlinkSync(downloadDestination);
      if (encryptedDownload && fs.existsSync(destination)) fs.unlinkSync(destination);
      writeReport('downloading', {
        current_model: {
          name: item.name,
          destination,
          attempt,
          max_attempts: maxAttempts,
          status: 'retrying_after_curl_failed',
          curl_status: curl.status,
        },
      });
      continue;
    }
    if (item.decrypt) {
      const keyEnv = item.decrypt.key_env;
      if (!keyEnv || !process.env[keyEnv]) {
        finalStatus = { ok: false, bytes: 0, reason: 'decrypt_key_missing', attempt, key_env: keyEnv || '' };
        if (fs.existsSync(downloadDestination)) fs.unlinkSync(downloadDestination);
        writeReport('downloading', {
          current_model: {
            name: item.name,
            destination,
            attempt,
            max_attempts: maxAttempts,
            status: 'retrying_after_decrypt_key_missing',
          },
        });
        continue;
      }
      const decrypt = spawnSync(
        'openssl',
        [
          'enc',
          '-d',
          '-aes-256-cbc',
          '-pbkdf2',
          '-iter',
          String(item.decrypt.iter || 200000),
          '-in',
          downloadDestination,
          '-out',
          destination,
          '-pass',
          `env:${keyEnv}`,
        ],
        { stdio: 'inherit' },
      );
      if (fs.existsSync(downloadDestination)) fs.unlinkSync(downloadDestination);
      if (decrypt.status !== 0) {
        finalStatus = { ok: false, bytes: 0, reason: 'decrypt_failed', attempt, decrypt_status: decrypt.status };
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
        writeReport('downloading', {
          current_model: {
            name: item.name,
            destination,
            attempt,
            max_attempts: maxAttempts,
            status: 'retrying_after_decrypt_failed',
            decrypt_status: decrypt.status,
          },
        });
        continue;
      }
    }
    finalStatus = validateFileSize(item, destination);
    if (finalStatus.ok) break;
    console.error(
      `[download_models] Invalid downloaded file for ${item.name} on attempt ${attempt}: ${JSON.stringify(finalStatus)}`,
    );
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }

  let extractResult = null;
  if (finalStatus.ok) {
    try {
      extractResult = extractDownloadedFile(item, destination);
    } catch (error) {
      finalStatus = { ok: false, bytes: finalStatus.bytes || 0, reason: 'extract_failed', error: error.message };
    }
  }

  results.push({
    name: item.name,
    status: finalStatus.ok ? 'downloaded' : 'failed',
    destination,
    extract: extractResult || undefined,
    ...finalStatus,
  });
  writeReport(finalStatus.ok ? 'downloading' : 'failed', {
    current_model: {
      name: item.name,
      destination,
      status: finalStatus.ok ? 'downloaded' : 'failed',
      ...finalStatus,
    },
  });
  if (!finalStatus.ok) process.exit(curlStatus || 41);
}

const report = writeReport('completed');
console.log(JSON.stringify(report, null, 2));
