#!/usr/bin/env node
/**
 * publish-fix.js
 *
 * Works around a known electron-builder bug (fixed only in the 27.0.0-alpha
 * line, not yet backported to the 26.x stable line we're on) where
 * concurrent asset uploads to a brand-new GitHub release tag can create TWO
 * separate draft releases instead of one — splitting the installer,
 * .blockmap, and latest.yml across them so neither release is usable on its
 * own for auto-update.
 *
 * Run this AFTER `electron-builder --publish always` (see the "dist" script
 * in package.json). Whatever electron-builder left behind on GitHub for
 * this version's tag — one draft, two drafts, a half-finished upload — this
 * script wipes it and republishes a single clean release built directly
 * from the local dist_electron/ output, with filenames that exactly match
 * what latest.yml expects (hyphens, no spaces).
 *
 * Network resilience:
 *  - Keep-alive is disabled so a stale pooled socket can't cause ECONNRESET.
 *  - Idempotent calls (list, delete, publish) are retried with backoff.
 *  - Uploads are retried too; any half-uploaded asset with the same name is
 *    deleted before each attempt so a retry never hits "already_exists".
 *  - Release creation is deliberately NOT retried (a blind retry could make
 *    a second draft — the very bug this script exists to fix). If it fails,
 *    just re-run the script: it cleans up before creating.
 *
 * Requires GH_TOKEN (or GITHUB_TOKEN) in the environment — the same token
 * electron-builder already uses to publish.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const pkg = require(path.join(__dirname, '..', 'package.json'));
const { owner, repo } = pkg.build.publish;
const version = pkg.version;
const tag = `v${version}`;
const distDir = path.join(__dirname, '..', 'dist_electron');

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('[publish-fix] GH_TOKEN (or GITHUB_TOKEN) is not set — cannot talk to the GitHub API.');
  process.exit(1);
}

// No socket reuse: avoids "read ECONNRESET" from GitHub closing an idle
// pooled connection right after a long upload.
const agent = new https.Agent({ keepAlive: false });

const API_TIMEOUT_MS = 30 * 1000; // API calls should be quick
const UPLOAD_IDLE_TIMEOUT_MS = 2 * 60 * 1000; // idle (no data flowing) timeout for big uploads

const RETRYABLE_CODES = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'];

function isRetryable(err) {
  if (err && RETRYABLE_CODES.includes(err.code)) return true;
  if (err && typeof err.status === 'number' && (err.status >= 500 || err.status === 429)) return true;
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(label, fn, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || i === attempts) throw err;
      const wait = 2000 * i;
      console.log(
        `[publish-fix] ${label} failed (${err.code || err.status || err.message}); retry ${i}/${attempts - 1} in ${wait / 1000}s...`
      );
      await sleep(wait);
    }
  }
}

function timeoutError(what) {
  const err = new Error(`${what} timed out`);
  err.code = 'ETIMEDOUT';
  return err;
}

function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        method,
        host: 'api.github.com',
        path: urlPath,
        agent,
        headers: {
          'User-Agent': 'dawini-publish-fix',
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          ...(data
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('error', reject);
        res.on('end', () => {
          let parsed = null;
          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(`${method} ${urlPath} -> ${res.statusCode}: ${raw}`);
            err.status = res.statusCode;
            reject(err);
          }
        });
      }
    );
    req.setTimeout(API_TIMEOUT_MS, () => req.destroy(timeoutError(`${method} ${urlPath}`)));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// DELETE that treats "already gone" (404) as success — important on retries,
// where the first attempt may have succeeded but the response was lost.
async function deleteQuietly(urlPath) {
  try {
    await apiRequest('DELETE', urlPath);
  } catch (err) {
    if (err.status === 404) return;
    throw err;
  }
}

function uploadAsset(uploadUrlBase, filePath, assetName, contentType) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const url = new URL(`${uploadUrlBase}?name=${encodeURIComponent(assetName)}`);
    const req = https.request(
      {
        method: 'POST',
        host: url.host,
        path: url.pathname + url.search,
        agent,
        headers: {
          'User-Agent': 'dawini-publish-fix',
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': contentType,
          'Content-Length': stat.size,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('error', reject);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            const err = new Error(`upload ${assetName} -> ${res.statusCode}: ${raw}`);
            err.status = res.statusCode;
            reject(err);
          }
        });
      }
    );
    req.setTimeout(UPLOAD_IDLE_TIMEOUT_MS, () => req.destroy(timeoutError(`upload ${assetName}`)));
    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
    stream.pipe(req);
  });
}

// Upload with retry. Before every attempt, remove any asset with the same
// name on this release (a reset mid-upload can leave a broken partial asset,
// and re-uploading the same name would then fail with 422 already_exists).
async function uploadWithRetry(release, uploadUrlBase, filePath, assetName, contentType) {
  console.log(`[publish-fix] Uploading ${assetName}...`);
  await withRetry(
    `upload ${assetName}`,
    async () => {
      const assets = await apiRequest('GET', `/repos/${owner}/${repo}/releases/${release.id}/assets?per_page=100`);
      for (const a of assets.filter((x) => x.name === assetName)) {
        console.log(`[publish-fix] Removing partial asset ${a.name} (id=${a.id}) before (re)upload`);
        await deleteQuietly(`/repos/${owner}/${repo}/releases/assets/${a.id}`);
      }
      await uploadAsset(uploadUrlBase, filePath, assetName, contentType);
    },
    4
  );
}

// electron-builder itself renames assets by turning spaces in the local
// filename into hyphens when it uploads (e.g. "Dawini Setup 1.0.5.exe" ->
// "Dawini-Setup-1.0.5.exe"). We replicate that so names match exactly what
// latest.yml references, regardless of how the local file is actually named.
function sanitizeName(filename) {
  return filename.replace(/\s+/g, '-');
}

function findLocalFiles() {
  const names = fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);

  // dist_electron accumulates every past build (1.0.3.exe, 1.0.4.exe, ...)
  // since electron-builder never cleans it between runs — so filtering by
  // "an .exe that isn't the uninstaller" isn't enough on its own; it must
  // also match the version currently in package.json, or an old leftover
  // build can get picked up and republished under the new version's tag.
  const installer = names.find(
    (n) =>
      n.toLowerCase().endsWith('.exe') &&
      n.includes(version) &&
      !n.toLowerCase().includes('uninstaller')
  );
  const blockmap = installer && names.find((n) => n === `${installer}.blockmap`);
  const latestYml = names.find((n) => n.toLowerCase() === 'latest.yml');

  if (!installer || !blockmap || !latestYml) {
    console.error(`[publish-fix] Could not find all expected build outputs for version ${version} in dist_electron/.`);
    console.error({ installer, blockmap, latestYml, allFiles: names });
    console.error('Did the build actually complete for this version? Aborting without touching GitHub.');
    process.exit(1);
  }

  return {
    installer: path.join(distDir, installer),
    installerName: sanitizeName(installer),
    blockmap: path.join(distDir, blockmap),
    blockmapName: sanitizeName(blockmap),
    latestYml: path.join(distDir, latestYml),
    latestYmlName: 'latest.yml',
  };
}

async function main() {
  console.log(`[publish-fix] Cleaning up and republishing ${tag} on ${owner}/${repo}...`);

  // Fail fast and touch nothing on GitHub if this version wasn't actually built.
  const files = findLocalFiles();

  // 1. Delete every existing release for this tag — this is what clears out
  //    electron-builder's duplicate drafts (or a half-uploaded single one).
  const releases = await withRetry('list releases', () =>
    apiRequest('GET', `/repos/${owner}/${repo}/releases?per_page=100`)
  );
  const matching = releases.filter((r) => r.tag_name === tag);

  for (const release of matching) {
    console.log(`[publish-fix] Deleting existing release id=${release.id} (draft=${release.draft})`);
    await withRetry(`delete release ${release.id}`, () =>
      deleteQuietly(`/repos/${owner}/${repo}/releases/${release.id}`)
    );
  }

  // A published release also creates a real git tag ref; drafts usually
  // don't, but attempt cleanup either way — a 404 here just means there
  // was nothing to remove. (Network errors are retried; other errors, such
  // as 422 for a missing ref, are ignored.)
  try {
    await withRetry('delete git tag', () => apiRequest('DELETE', `/repos/${owner}/${repo}/git/refs/tags/${tag}`));
    console.log(`[publish-fix] Removed leftover git tag ${tag}`);
  } catch {
    // No tag existed — fine, nothing to do.
  }

  // 2. Create one fresh draft release. Creating as a draft first (rather
  //    than publishing directly) sidesteps a separate electron-builder/
  //    GitHub quirk where a first-time tag can fail tag validation when
  //    published in the same request it's created.
  //
  //    NOT retried on purpose: a blind retry after a lost response could
  //    create a second draft. If this fails, re-run the script.
  const created = await apiRequest('POST', `/repos/${owner}/${repo}/releases`, {
    tag_name: tag,
    name: version,
    draft: true,
    prerelease: false,
  });

  const uploadUrlBase = created.upload_url.replace(/\{.*\}$/, '');

  // 3. Upload the three files ONE AT A TIME. Doing this sequentially,
  //    rather than in parallel like electron-builder does, is what avoids
  //    the race condition that caused the duplicate drafts in the first
  //    place.
  await uploadWithRetry(created, uploadUrlBase, files.installer, files.installerName, 'application/octet-stream');
  await uploadWithRetry(created, uploadUrlBase, files.blockmap, files.blockmapName, 'application/octet-stream');
  await uploadWithRetry(created, uploadUrlBase, files.latestYml, files.latestYmlName, 'text/yaml');

  // 4. Verify all three assets are really there before publishing.
  const finalAssets = await withRetry('verify assets', () =>
    apiRequest('GET', `/repos/${owner}/${repo}/releases/${created.id}/assets?per_page=100`)
  );
  const have = new Set(finalAssets.map((a) => a.name));
  const expected = [files.installerName, files.blockmapName, files.latestYmlName];
  const missing = expected.filter((n) => !have.has(n));
  if (missing.length) {
    throw new Error(`Assets missing on the draft release, NOT publishing: ${missing.join(', ')}`);
  }

  // 5. Publish it — this is the step you'd otherwise do by hand on GitHub.
  await withRetry('publish release', () =>
    apiRequest('PATCH', `/repos/${owner}/${repo}/releases/${created.id}`, { draft: false })
  );

  console.log(`[publish-fix] Done. Published: ${created.html_url}`);
  console.log('[publish-fix] Add your "what\'s new" notes on that page whenever you\'re ready — electron-updater reads them at check time, no rebuild needed.');
}

main().catch((err) => {
  console.error('[publish-fix] Failed:', err.message);
  console.error('[publish-fix] Safe to re-run: `node scripts/publish-fix.js` (it cleans up any leftover drafts first).');
  process.exit(1);
});