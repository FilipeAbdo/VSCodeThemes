const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function createRelease(version, root = path.join(__dirname, "..")) {
	if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
		throw new Error("Usage: npm run release -- 1.2.3 (numeric major.minor.patch, without a v prefix).");
	}
	const npmCli = process.env.npm_execpath;
	if (!npmCli) throw new Error("Run this command through npm: npm run release -- 1.2.3");
	const git = args => execFileSync("git", ["--no-pager", ...args], {
		cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
	}).trim();
	git(["symbolic-ref", "--quiet", "HEAD"]);
	if (git(["status", "--porcelain", "--untracked-files=normal"])) {
		throw new Error("Commit or stash all repository changes before creating a release. Stop build watchers first.");
	}
	if (git(["tag", "--list", version])) {
		throw new Error(`Tag ${version} already exists. No files changed.`);
	}
	for (const file of ["package.json", "package-lock.json"]) {
		if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}.`);
	}
	execFileSync(process.execPath, [
		npmCli, "version", version, "--no-git-tag-version", "--ignore-scripts"
	], { cwd: root, stdio: "inherit" });
	const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
	if (manifest.version !== version || lock.version !== version || lock.packages?.[""]?.version !== version) {
		throw new Error("Release version files do not match. Review the working tree; no commit or tag was created.");
	}
	git(["add", "--", "package.json", "package-lock.json"]);
	git(["commit", "-m", `Release Violet ${version}\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`]);
	if (git(["status", "--porcelain", "--untracked-files=normal"])) {
		throw new Error("The release commit was created, but the working tree changed. Review it before creating the tag.");
	}
	git(["tag", "-a", version, "-m", `Violet ${version}`]);
	console.log(`Created release commit and tag ${version}. Nothing pushed.`);
}

if (require.main === module) {
	try {
		if (process.argv.length !== 3) throw new Error("Usage: npm run release -- 1.2.3");
		createRelease(process.argv[2]);
	} catch (error) {
		console.error(error.message);
		if (error.stderr) console.error(error.stderr.toString().trim());
		console.error("Release stopped. Review git status and tags before retrying; no automatic rollback was performed.");
		process.exitCode = 1;
	}
}

module.exports = createRelease;
