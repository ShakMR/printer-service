const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const target = process.argv[2] || 'node22-macos-x64,node22-macos-arm64';

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(`The macOS packaging tool requires Node.js 22 or newer on the build machine (found ${process.versions.node}).`);
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCommand, ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const pkg = spawnSync(process.platform === 'win32' ? 'pkg.cmd' : 'pkg', [
  '.', '--targets', target, '--out-path', 'release',
], { stdio: 'inherit' });
if (pkg.status !== 0) process.exit(pkg.status ?? 1);

if (target === 'node22-macos-arm64') {
  const binary = path.join('release', 'macos-lan-print-server-arm64', 'macos-lan-print-server');
  const archive = path.join('release', 'macos-lan-print-server-arm64.zip');
  const zip = spawnSync('zip', ['-j', '-FS', archive, binary, 'README.md', '.env.example'], { stdio: 'inherit' });
  if (zip.status !== 0) process.exit(zip.status ?? 1);
  fs.chmodSync(binary, 0o755);
  console.log(`Created ${archive}`);
}
