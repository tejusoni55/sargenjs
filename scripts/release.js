// scripts/release.js (ESM) — corrected & robust
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: opts.stdio ?? 'pipe', ...opts }).toString().trim();
}
function runInherit(cmd) {
  return execSync(cmd, { stdio: 'inherit' });
}

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: node ./scripts/release.js <patch|minor|major>');
  process.exit(1);
}

try {
  // ensure we have remote refs and tags
  runInherit('git fetch --tags');

  // create version commit & tag using npm
  const msg = `Release: New ${type} version: %s`;
  runInherit(`npm version ${type} -m "${msg}"`);

  // read version from package.json
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const tag = `v${pkg.version}`;
  console.log(`Created tag (expected): ${tag}`);

  // check if the tag already exists on origin
  const ls = run(`git ls-remote --tags origin refs/tags/${tag} || true`);
  if (ls && ls.length > 0) {
    console.error(`❌ Remote already contains tag ${tag}. Aborting to avoid no-op or overwriting a remote tag.`);
    console.error('Hint: bump the version (patch/minor/major) or delete the remote tag if you truly want to recreate it.');
    process.exit(1);
  }

  // push the commit (package.json change)
  runInherit('git push origin HEAD');

  // push only the new tag explicitly (this causes GitHub to trigger tag workflows)
  runInherit(`git push origin ${tag}`);

  console.log('✅ Release flow finished — commit and tag pushed. GitHub should trigger the tag workflow.');
} catch (err) {
  console.error('Release script failed:', err.message ?? err);
  process.exit(1);
}
