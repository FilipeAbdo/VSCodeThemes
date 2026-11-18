const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const createRelease = require("./release.cjs");

test("release defaults to patch and resets lower components for minor and major", () => {
	const { resolveVersion } = createRelease;
	for (const [option, expected] of [
		[undefined, "2.7.10"],
		["--significant", "2.8.0"], ["-i", "2.8.0"],
		["--major", "3.0.0"], ["-m", "3.0.0"],
		["4.5.6", "4.5.6"]
	]) {
		assert.equal(resolveVersion(option, "2.7.9"), expected);
	}
	for (const invalid of ["--minor", "--major -i", "-x", "v1.2.3", "01.2.3", "1.2"]) {
		assert.throws(() => resolveVersion(invalid, "2.7.9"), /Usage/);
	}
	for (const invalid of ["1.2", "1.2.3-beta", undefined]) {
		assert.throws(() => resolveVersion(undefined, invalid), /invalid package version/);
	}
});

test("release commits synchronized version files before tagging in a nested project", t => {
	assert.ok(process.env.npm_execpath, "Run this test through npm.");
	const repository = fs.mkdtempSync(path.join(os.tmpdir(), "violet-release-"));
	t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
	const root = path.join(repository, "Violet");
	fs.mkdirSync(root);
	const git = args => execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
	git(["init", "--quiet"]);
	git(["config", "user.name", "Release Test"]);
	git(["config", "user.email", "release-test@example.invalid"]);
	git(["config", "commit.gpgsign", "false"]);
	git(["config", "tag.gpgsign", "false"]);
	git(["config", "core.hooksPath", path.join(repository, "no-hooks")]);
	fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
		name: "release-test", version: "0.1.0", private: true
	}));
	fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
		name: "release-test", version: "0.1.0", lockfileVersion: 3,
		packages: { "": { name: "release-test", version: "0.1.0" } }
	}));
	git(["add", "."]);
	git(["commit", "--quiet", "-m", "Initial"]);
	const originalHead = git(["rev-parse", "HEAD"]);
	for (const invalid of ["v1.2.3", "01.2.3", "1.2", "1.2.3;echo"]) {
		assert.throws(() => createRelease(invalid, root), /Usage/);
	}
	fs.writeFileSync(path.join(repository, "unrelated.txt"), "Keep this change");
	assert.throws(() => createRelease("1.2.3", root), /Commit or stash/);
	assert.equal(git(["rev-parse", "HEAD"]), originalHead);
	fs.unlinkSync(path.join(repository, "unrelated.txt"));
	git(["tag", "1.2.3"]);
	assert.throws(() => createRelease("1.2.3", root), /already exists/);
	assert.equal(JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version, "0.1.0");
	git(["tag", "-d", "1.2.3"]);
	createRelease("1.2.3", root);
	assert.notEqual(git(["rev-parse", "HEAD"]), originalHead);
	assert.equal(git(["rev-parse", "1.2.3^{commit}"]), git(["rev-parse", "HEAD"]));
	const manifest = JSON.parse(git(["show", "1.2.3:Violet/package.json"]));
	const lock = JSON.parse(git(["show", "1.2.3:Violet/package-lock.json"]));
	assert.equal(manifest.version, "1.2.3");
	assert.equal(lock.version, "1.2.3");
	assert.equal(lock.packages[""].version, "1.2.3");
	assert.equal(git(["status", "--porcelain"]), "");
	for (const [option, expected] of [[undefined, "1.2.4"], ["-i", "1.3.0"], ["-m", "2.0.0"]]) {
		assert.equal(createRelease(option, root), expected);
		assert.equal(JSON.parse(git(["show", `${expected}:Violet/package.json`])).version, expected);
		const taggedLock = JSON.parse(git(["show", `${expected}:Violet/package-lock.json`]));
		assert.equal(taggedLock.version, expected);
		assert.equal(taggedLock.packages[""].version, expected);
		assert.equal(git(["rev-parse", `${expected}^{commit}`]), git(["rev-parse", "HEAD"]));
		assert.equal(git(["status", "--porcelain"]), "");
	}
});
