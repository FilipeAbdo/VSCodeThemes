const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const usage = "Usage: npm run release [-- --significant|-i|--major|-m|1.2.3] (default: patch).";

function resolveVersion(request, currentVersion) {
	if (typeof request === "string" && versionPattern.test(request)) return request;
	if (request !== undefined && !["--significant", "-i", "--major", "-m"].includes(request)) {
		throw new Error(usage);
	}
	if (typeof currentVersion !== "string" || !versionPattern.test(currentVersion)) {
		throw new Error(`Cannot increment invalid package version: ${currentVersion}`);
	}
	const parts = currentVersion.split(".").map(BigInt);
	const index = ["--major", "-m"].includes(request) ? 0
		: ["--significant", "-i"].includes(request) ? 1 : 2;
	parts[index] += 1n;
	for (let i = index + 1; i < parts.length; i++) parts[i] = 0n;
	return parts.join(".");
}

function createRelease(request, root = path.join(__dirname, "..")) {
	const version = resolveVersion(request, JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version);
	const npmCli = process.env.npm_execpath;
	if (!npmCli) throw new Error("Run this command through npm: npm run release");
	const git = args => execFileSync("git", ["--no-pager", ...args], {
		cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
	}).trim();
	git(["symbolic-ref", "--quiet", "HEAD"]);
	if (git(["status", "--porcelain", "--untracked-files=normal"])) {
		console.error("\x1b[31mRelease blocked: repository is not clean. Commit or stash all repository changes before creating a release. Stop build watchers first.\x1b[0m");
		return null;
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
	return version;
}

if (require.main === module) {
	try {
		if (process.argv.length > 3) throw new Error(usage);
		if (createRelease(process.argv[2]) === null) process.exitCode = 1;
	} catch (error) {
		console.error(error.message);
		if (error.stderr) console.error(error.stderr.toString().trim());
		console.error("Release stopped. Review git status and tags before retrying; no automatic rollback was performed.");
		process.exitCode = 1;
	}
}

module.exports = createRelease;
module.exports.resolveVersion = resolveVersion;
