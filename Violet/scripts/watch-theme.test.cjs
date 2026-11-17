const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { watchDecorationStyles } = require("./watch-decorations-agent.cjs");

test("decoration agent watcher debounces saves and ignores its own rebuilds", { timeout: 10000 }, async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "violet-decoration-watch-"));
	const files = ["release.json", "development.json"].map(file => path.join(root, file));
	for (const file of files) fs.writeFileSync(file, '{"decorationStyles":{"color":"#123456"}}');
	let runs = 0;
	let releaseRun;
	const savedFiles = [];
	const errors = [];
	const watcher = watchDecorationStyles({
		files, interval: 20, debounce: 80,
		async run(changedFiles) {
			runs++;
			savedFiles.push(changedFiles);
			await new Promise(resolve => { releaseRun = resolve; });
			for (const file of files) fs.writeFileSync(file, '{"decorationStyles":{"color":"#abcdef"}}');
		},
		onError: error => errors.push(error)
	});
	t.after(() => {
		watcher.dispose();
		fs.rmSync(root, { recursive: true });
	});
	async function waitFor(predicate) {
		const deadline = Date.now() + 3000;
		while (!predicate()) {
			assert.ok(Date.now() < deadline, "Watcher did not launch");
			await new Promise(resolve => setTimeout(resolve, 20));
		}
	}
	fs.writeFileSync(files[0], '{\n "decorationStyles": { "color": "#123456" }, "colors": { "editor.background": "#ffffff" }\n}');
	await new Promise(resolve => setTimeout(resolve, 180));
	assert.equal(runs, 0);
	for (const file of files) fs.writeFileSync(file, '{"decorationStyles":{"color":"#654321"}}');
	await waitFor(() => runs === 1);
	assert.deepStrictEqual(savedFiles[0].sort(), [...files].sort());
	fs.writeFileSync(files[0], '{"decorationStyles":{"color":"#111111"}}');
	await new Promise(resolve => setTimeout(resolve, 180));
	assert.equal(runs, 1);
	releaseRun();
	await new Promise(resolve => setTimeout(resolve, 180));
	assert.equal(runs, 1);
	fs.writeFileSync(files[0], '{"decorationStyles":{"color":"#222222"}}');
	await waitFor(() => runs === 2);
	releaseRun();
	await new Promise(resolve => setTimeout(resolve, 180));
	watcher.dispose();
	fs.writeFileSync(files[0], '{"decorationStyles":{"color":"#333333"}}');
	await new Promise(resolve => setTimeout(resolve, 180));
	assert.equal(runs, 2);
	assert.deepStrictEqual(errors, []);
});

test("decoration agent watcher reports failures and retries on a later save", { timeout: 10000 }, async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "violet-decoration-failure-"));
	const file = path.join(root, "styles.json");
	fs.writeFileSync(file, '{"decorationStyles":{"color":"#123456"}}');
	const errors = [];
	let runs = 0;
	const watcher = watchDecorationStyles({
		files: [file], interval: 20, debounce: 40,
		async run() {
			runs++;
			throw new Error("Agent failed");
		},
		onError: error => errors.push(error)
	});
	t.after(() => {
		watcher.dispose();
		fs.rmSync(root, { recursive: true });
	});
	async function waitFor(predicate) {
		const deadline = Date.now() + 3000;
		while (!predicate()) {
			assert.ok(Date.now() < deadline, "Expected watcher result");
			await new Promise(resolve => setTimeout(resolve, 20));
		}
	}
	fs.writeFileSync(file, "{");
	await waitFor(() => errors.length > 0);
	assert.equal(runs, 0);
	fs.writeFileSync(file, '{"decorationStyles":{"color":"#654321"}}');
	await waitFor(() => runs === 1 && errors.some(error => error.message === "Agent failed"));
	fs.writeFileSync(file, '{"decorationStyles":{"color":"#abcdef"}}');
	await waitFor(() => runs === 2);
});

test("watch rebuilds palette changes and restores managed manifest colors", { timeout: 30000 }, async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "violet-watch-"));
	const scripts = path.join(root, "scripts");
	const src = path.join(root, "src");
	fs.mkdirSync(scripts);
	fs.mkdirSync(src);
	const manifest = structuredClone(require("../package.json"));
	manifest.contributes.configurationDefaults["workbench.colorCustomizations"]["[VS Code Violet Theme]"] = {
		"tab.inactiveForeground": "#000000",
		"tab.unfocusedInactiveForeground": "#000000",
		"editor.background": "#123456"
	};
	const manifestPath = path.join(root, "package.json");
	fs.writeFileSync(manifestPath, JSON.stringify(manifest));
	fs.copyFileSync(path.join(__dirname, "build-theme.cjs"), path.join(scripts, "build-theme.cjs"));
	fs.copyFileSync(path.join(__dirname, "build-development.cjs"), path.join(scripts, "build-development.cjs"));
	fs.writeFileSync(path.join(root, "extension.cjs"), "module.exports = {};\n");
	fs.mkdirSync(path.join(root, "images"));
	fs.copyFileSync(path.join(__dirname, "..", "images", "icon-source.svg"), path.join(root, "images", "icon-source.svg"));
	fs.copyFileSync(path.join(__dirname, "..", manifest.icon), path.join(root, manifest.icon));
	fs.copyFileSync(path.join(__dirname, "..", "images", "icon.svg"), path.join(root, "images", "icon.svg"));
	fs.copyFileSync(path.join(__dirname, "..", "README.md"), path.join(root, "README.md"));
	fs.copyFileSync(path.join(__dirname, "..", "images", "palette.png"), path.join(root, "images", "palette.png"));
	fs.writeFileSync(path.join(scripts, "render-palette.cjs"), "module.exports = async () => {};\n");
	fs.writeFileSync(path.join(src, "theme.cjs"), `const color = require("./palette.cjs");
module.exports = {
	name: "VS Code Violet Theme",
	decorationStyles: { unusedFontStyle: "italic", attributeAccessForeground: color, unusedForeground: "#00000080" },
	configurationColorDefaults: { "tab.inactiveForeground": color, "tab.unfocusedInactiveForeground": color },
	colors: { "violetTheme.unusedForeground": "#00000080" }
};\n`);
	const palettePath = path.join(src, "palette.cjs");
	fs.writeFileSync(palettePath, 'module.exports = "#123456";\n');
	const args = manifest.scripts.watch.split(" ").slice(1);
	const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
	let output = "";
	child.stdout.on("data", data => { output += data; });
	child.stderr.on("data", data => { output += data; });
	const colors = () => JSON.parse(fs.readFileSync(manifestPath, "utf8"))
		.contributes.configurationDefaults["workbench.colorCustomizations"]["[VS Code Violet Theme]"];
	async function waitFor(predicate) {
		const deadline = Date.now() + 10000;
		while (!predicate()) {
			if (child.exitCode !== null || Date.now() > deadline) {
				throw new Error(`Watch task did not complete as expected:\n${output}`);
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}
	try {
		await waitFor(() => colors()["tab.inactiveForeground"] === "#123456" && output.includes("Built VS Code Violet Theme."));
		await new Promise(resolve => setTimeout(resolve, 500));
		fs.writeFileSync(palettePath, 'module.exports = "#abcdef";\n');
		await waitFor(() => colors()["tab.inactiveForeground"] === "#abcdef" && colors()["tab.unfocusedInactiveForeground"] === "#abcdef");
		await new Promise(resolve => setTimeout(resolve, 500));
		const edited = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		edited.description = "Preserve unrelated changes";
		edited.contributes.configurationDefaults["workbench.colorCustomizations"]["[VS Code Violet Theme]"]["tab.inactiveForeground"] = "#ffffff";
		fs.writeFileSync(manifestPath, JSON.stringify(edited, null, 2));
		await waitFor(() => colors()["tab.inactiveForeground"] === "#abcdef");
		await waitFor(() => {
			const staged = path.join(root, ".vscode", "development", "package.json");
			return fs.existsSync(staged) && JSON.parse(fs.readFileSync(staged, "utf8"))
				.contributes.configurationDefaults["workbench.colorCustomizations"]["[VS Code Violet Theme]"]["tab.inactiveForeground"] === "#abcdef";
		});
		assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).description, "Preserve unrelated changes");
		assert.equal(colors()["editor.background"], "#123456");
	} finally {
		const closed = new Promise(resolve => child.once("close", resolve));
		child.kill();
		await closed;
		fs.rmSync(root, { recursive: true });
	}
});
