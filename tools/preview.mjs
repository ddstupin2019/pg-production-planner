import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
/** @type {import('node:child_process').ChildProcess | undefined} */
let child;

/** Avoid Windows .cmd shims and shell interpolation of the workspace's ampersand.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, [vite, ...args], { cwd, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child?.kill();
  });
}

const buildCode = await run(['build']);
process.exitCode =
  buildCode === 0
    ? await run(['preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'])
    : buildCode;
