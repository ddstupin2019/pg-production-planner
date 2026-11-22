import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';

/** @param {string} root @param {string} target */
export function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path must be strictly inside its fixed root');
  }
}

/** Reject links in every component, including Windows junctions.
 * @param {string} root @param {string} target
 */
export async function inspectPath(root, target) {
  assertInside(root, target);
  let current = root;
  for (const part of path.relative(root, target).split(path.sep)) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
      throw new Error('Links and nonregular files are forbidden');
    }
    assertInside(root, await realpath(current));
  }
  return lstat(target);
}

/** @param {import('node:fs').Stats} left @param {import('node:fs').Stats} right */
function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.mode === right.mode
  );
}

/** Read only through a verified handle; reject concurrent replacement/change.
 * @param {string} root @param {string} target
 */
export async function readPinnedFile(root, target) {
  const before = await inspectPath(root, target);
  if (!before.isFile()) throw new Error('Expected a regular file');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!sameFile(before, opened)) throw new Error('File changed before open');
    const bytes = await handle.readFile();
    const after = await inspectPath(root, target);
    if (!sameFile(opened, after) || !sameFile(opened, await handle.stat())) {
      throw new Error('File changed during read');
    }
    return { bytes, mode: opened.mode & 0o111 ? '100755' : '100644' };
  } finally {
    await handle.close();
  }
}
