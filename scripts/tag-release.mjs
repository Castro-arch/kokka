// Creates the project-wide `vX.Y.Z` tag after the version PR has been merged.
// All @kokka/* packages are versioned together (changesets "fixed"), so any of them is the source.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("packages/shared/package.json", "utf8"));
const tag = `v${version}`;

execFileSync("git", ["tag", "-a", tag, "-m", tag], { stdio: "inherit" });
console.log(`Created ${tag}. Push it with: git push origin ${tag}`);
