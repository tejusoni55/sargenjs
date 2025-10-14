// scripts/release.js
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const type = process.argv[2];

if (!["patch", "minor", "major"].includes(type)) {
  console.error("Usage: node scripts/release.js <patch|minor|major>");
  process.exit(1);
}

try {
  // fetch tags and latest
  execSync("git fetch --tags", { stdio: "inherit" });

  // run npm version which updates package.json, package-lock and creates a commit + tag
  const msg = `chore(release): %s [skip ci]`;
  execSync(`npm version ${type} -m "${msg}"`, { stdio: "inherit" });

  // push commit
  execSync("git push origin HEAD", { stdio: "inherit" });

  // push tags explicitly
  execSync("git push origin --tags", { stdio: "inherit" });

  console.log("Release flow finished — commit and tags pushed.");
  console.log("A GitHub Action will pick up the new tag and publish to npm.");
} catch (err) {
  console.error("Release script failed:", err.message || err);
  process.exit(1);
}
