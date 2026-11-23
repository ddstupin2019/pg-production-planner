import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPath, readPinnedFile } from './files.mjs';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const kind = process.argv[2] ?? 'source';
if (process.argv.length > 3 || !['source', 'build', 'delivery', 'evidence'].includes(kind)) {
  throw new Error('Usage: node tools/manifest.mjs [source|build|delivery|evidence]');
}

const rootFiles = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'eslint.config.mjs',
  'prettier.config.mjs',
  '.prettierignore',
  '.gitignore',
  '.gitattributes',
  'README.md',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'index.html',
]);
const sourceTrees = new Set(['src', 'docs', 'tests', 'public', 'tools']);
const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'artifacts',
  'evidence',
  'logs',
  '.cache',
  '.playwright-mcp',
  '__pycache__',
]);
/** @type {{ path: string; mode: string; sha256: string }[]} */
const entries = [];
/** @param {Buffer | string} bytes */
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** Fixed UTF-16 code-unit ordinal order; no locale-sensitive sorting.
 * @param {string} left @param {string} right
 */
const ordinal = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** @param {string} relative */
async function collect(relative) {
  const target = path.join(root, relative);
  const stat = await inspectPath(root, target);
  if (stat.isDirectory()) {
    for (const name of (await readdir(target)).sort(ordinal)) {
      if (ignoredDirectories.has(name) || name.endsWith('.log') || name.endsWith('.tsbuildinfo')) {
        continue;
      }
      await collect(`${relative}/${name}`);
    }
  } else {
    // Fail closed on sensitive filenames instead of publishing their content hashes.
    if (/(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|credentials(?:\..*)?)$/i.test(relative)) {
      throw new Error('Sensitive path is not an accepted candidate input');
    }
    const { bytes, mode } = await readPinnedFile(root, target);
    entries.push({ path: relative, mode, sha256: hash(bytes) });
  }
}

if (kind === 'source') {
  for (const name of (await readdir(root)).sort(ordinal)) {
    if (rootFiles.has(name) || sourceTrees.has(name) || name.toLowerCase().endsWith('.pdf')) {
      await collect(name);
    }
  }
  for (const required of rootFiles) {
    // A narrative README is included as soon as its owner supplies it, not fabricated here.
    if (required === 'README.md') continue;
    if (!entries.some((entry) => entry.path === required)) {
      throw new Error(`Missing required candidate file: ${required}`);
    }
  }
  if (!entries.some((entry) => entry.path.toLowerCase().endsWith('.pdf'))) {
    throw new Error('Original PDF identity is required');
  }
} else {
  // These roots are fixed; a manifest/evidence report must be saved outside its input tree.
  await collect(kind === 'build' ? 'dist' : kind === 'delivery' ? 'artifacts' : 'evidence');
}

entries.sort((left, right) => ordinal(left.path, right.path));
if (!entries.length) throw new Error('Empty input is not evidence');
const canonicalBytes = Buffer.from(`${JSON.stringify(entries, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      kind,
      algorithm: 'sha256',
      canonicalization: 'UTF-8, two-space JSON array, LF final newline, ordinal path order',
      [kind === 'source' ? 'candidate_id' : kind === 'evidence' ? 'evidence_id' : `${kind}_id`]:
        hash(canonicalBytes),
      entries,
    },
    null,
    2,
  ),
);
