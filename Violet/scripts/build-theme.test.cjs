const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

async function buildWithOverrides(colors) {
	const manifest = structuredClone(require("../package.json"));
	manifest.contributes.configurationDefaults["workbench.colorCustomizations"] = {
		"editor.foreground": "#abcdef",
		"[VS Code Violet Theme]": {
			"tab.inactiveForeground": "#000000",
			"tab.unfocusedInactiveForeground": "#000000",
			"editor.background": "#123456"
		},
		"[Another Theme]": { "editor.background": "#654321" }
	};
	const source = require("../src/theme.cjs");
	const files = new Map();
	const sandbox = {
		module: { exports: {} },
		__dirname,
		process: { exitCode: 0, argv: [] },
		console: { log() {}, error() {} },
		require(name) {
			if (name === "node:fs") return {
				mkdirSync() {},
				readFileSync() { return JSON.stringify(manifest); },
				writeFileSync(file, data) { files.set(file, data); }
			};
			if (name === "../src/theme.cjs") return { ...source, configurationColorDefaults: colors };
			if (name === "./render-palette.cjs") return async () => {};
			return require(name);
		}
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "build-theme.cjs"), "utf8"), sandbox);
	await sandbox.module.exports;
	const updatedManifest = JSON.parse(files.get(path.join(__dirname, "..", "package.json")));
	return { manifest: updatedManifest, files };
}

test("build updates palette-derived defaults without overwriting other settings", async () => {
	const colors = {
		"tab.inactiveForeground": "#123abc",
		"tab.unfocusedInactiveForeground": "#456def"
	};
	const { manifest, files } = await buildWithOverrides(colors);
	const defaults = manifest.contributes.configurationDefaults;
	assert.equal(defaults["workbench.experimental.modernUIEditorTabStyle"], "pill");
	assert.equal(defaults["workbench.colorCustomizations"]["editor.foreground"], "#abcdef");
	assert.deepStrictEqual(defaults["workbench.colorCustomizations"]["[Another Theme]"], { "editor.background": "#654321" });
	assert.deepStrictEqual(defaults["workbench.colorCustomizations"]["[VS Code Violet Theme]"], {
		...colors,
		"editor.background": "#123456"
	});
	assert.ok(files.has(path.join(__dirname, "..", "package.json")));
	const generated = JSON.parse(files.get(path.join(__dirname, "..", "themes", "VS Code Violet Theme-color-theme.json")));
	assert.equal(Object.hasOwn(generated, "configurationColorDefaults"), false);
	assert.equal(Object.hasOwn(generated, "decorationStyles"), false);
});

test("build rejects invalid palette-derived configuration colors", async () => {
	await assert.rejects(buildWithOverrides({ "tab.inactiveForeground": undefined }), /Invalid configuration color tab.inactiveForeground/);
	await assert.rejects(buildWithOverrides({ "tab.inactiveForeground": "not-a-color" }), /Invalid configuration color tab.inactiveForeground/);
});
