const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

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
	decorationStyles: { unusedFontStyle: "italic" },
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
