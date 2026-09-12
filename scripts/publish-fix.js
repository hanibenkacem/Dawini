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

function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        method,
        host: 'api.github.com',
        path: urlPath,
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
            reject(new Error(`${method} ${urlPath} -> ${res.statusCode}: ${raw}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
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
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`upload ${assetName} -> ${res.statusCode}: ${raw}`));
          }
        });
      }
    );
    req.on('error', reject);
    fs.createReadStream(filePath).pipe(req);
  });
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
  const releases = await apiRequest('GET', `/repos/${owner}/${repo}/releases?per_page=100`);
  const matching = releases.filter((r) => r.tag_name === tag);

  for (const release of matching) {
    console.log(`[publish-fix] Deleting existing release id=${release.id} (draft=${release.draft})`);
    await apiRequest('DELETE', `/repos/${owner}/${repo}/releases/${release.id}`);
  }

  // A published release also creates a real git tag ref; drafts usually
  // don't, but attempt cleanup either way — a 404 here just means there
  // was nothing to remove.
  try {
    await apiRequest('DELETE', `/repos/${owner}/${repo}/git/refs/tags/${tag}`);
    console.log(`[publish-fix] Removed leftover git tag ${tag}`);
  } catch {
    // No tag existed — fine, nothing to do.
  }

  // 2. Create one fresh draft release. Creating as a draft first (rather
  //    than publishing directly) sidesteps a separate electron-builder/
  //    GitHub quirk where a first-time tag can fail tag validation when
  //    published in the same request it's created.
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
  console.log(`[publish-fix] Uploading ${files.installerName}...`);
  await uploadAsset(uploadUrlBase, files.installer, files.installerName, 'application/octet-stream');

  console.log(`[publish-fix] Uploading ${files.blockmapName}...`);
  await uploadAsset(uploadUrlBase, files.blockmap, files.blockmapName, 'application/octet-stream');

  console.log(`[publish-fix] Uploading ${files.latestYmlName}...`);
  await uploadAsset(uploadUrlBase, files.latestYml, files.latestYmlName, 'text/yaml');

  // 4. Publish it — this is the step you'd otherwise do by hand on GitHub.
  await apiRequest('PATCH', `/repos/${owner}/${repo}/releases/${created.id}`, { draft: false });

  console.log(`[publish-fix] Done. Published: ${created.html_url}`);
  console.log('[publish-fix] Add your "what\'s new" notes on that page whenever you\'re ready — electron-updater reads them at check time, no rebuild needed.');
}

main().catch((err) => {
  console.error('[publish-fix] Failed:', err.message);
  process.exit(1);
});