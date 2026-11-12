const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

for (const release of [false, true]) test(`${release ? "release" : "development"} install command reloads only after the local task succeeds`, async () => {
	for (const outcome of [0, 1, undefined, "start-error", "missing"]) {
		const task = { name: release ? "Install Violet release locally" : "Install Violet theme locally" };
		let listener;
		let disposed = false;
		const commands = [];
		const vscode = {
			tasks: {
				fetchTasks: async () => outcome === "missing" ? [] : [task],
				onDidEndTaskProcess(callback) {
					listener = callback;
					return { dispose() { disposed = true; } };
				},
				async executeTask(selected) {
					assert.equal(selected, task);
					assert.deepStrictEqual(commands, []);
					if (outcome === "start-error") throw new Error("Cannot start task");
					listener({ execution: { task: { name: "Other task" } }, exitCode: 0 });
					listener({ execution: { task }, exitCode: outcome });
				}
			},
			commands: { async executeCommand(command) { commands.push(command); } }
		};
		const sandbox = {
			module: { exports: {} },
			require: name => name === "vscode" ? vscode
				: name === "./package.json" ? require("../package.json") : require(name)
		};
		vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "extension.cjs"), "utf8"), sandbox);
		if (outcome === 0) {
			await sandbox.module.exports.installAndReload(release);
			assert.deepStrictEqual(commands, ["workbench.action.reloadWindow"]);
		} else {
			await assert.rejects(sandbox.module.exports.installAndReload(release));
			assert.deepStrictEqual(commands, []);
		}
		assert.equal(disposed, outcome !== "missing");
	}
});

test("local installer switches between development and release in the same directory", async () => {
	const root = path.join(__dirname, "..");
	const home = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "violet-install-"));
	const manifest = require("../package.json");
	const destination = path.join(home, ".vscode", "extensions", `${manifest.name}-local`);
	try {
		for (const release of [false, true, false]) {
			const sandbox = {
				module: { exports: {} },
				__dirname,
				process: { argv: release ? ["--release"] : [], exitCode: 0 },
				console: { log() {}, error() {} },
				require(name) {
					if (name === "node:os") return { homedir: () => home };
					if (name === "./build-theme.cjs") return Promise.resolve();
					return require(name);
				}
			};
			vm.runInNewContext(fs.readFileSync(path.join(__dirname, "install-local.cjs"), "utf8"), sandbox);
			await sandbox.module.exports;
			const installed = JSON.parse(fs.readFileSync(path.join(destination, "package.json"), "utf8"));
			assert.equal(Boolean(installed.contributes.commands), !release);
			assert.equal(Boolean(installed.contributes.keybindings), !release);
			for (const file of [manifest.main, manifest.icon, "themes/decoration-styles.json", ...manifest.contributes.themes.map(theme => theme.path)]) {
				assert.deepStrictEqual(fs.readFileSync(path.join(destination, file)), fs.readFileSync(path.join(root, file)));
			}
		}
	} finally {
		fs.rmSync(home, { recursive: true });
	}
});

test("development build adds shortcuts without changing the release manifest", () => {
	const root = path.join(__dirname, "..");
	const destination = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "violet-development-"));
	const original = fs.readFileSync(path.join(root, "package.json"), "utf8");
	try {
		require("./build-development.cjs")(root, destination);
		const release = JSON.parse(original);
		const development = JSON.parse(fs.readFileSync(path.join(destination, "package.json"), "utf8"));
		assert.equal(release.contributes.commands, undefined);
		assert.equal(release.contributes.keybindings, undefined);
		assert.deepStrictEqual(development.contributes.commands, [{
			command: "violetTheme.installAndReload",
			title: "Violet Theme: Install Locally and Reload Window"
		}, {
			command: "violetTheme.installReleaseAndReload",
			title: "Violet Theme: Install Release Locally and Reload Window"
		}]);
		assert.deepStrictEqual(development.contributes.keybindings, [{
			command: "violetTheme.installAndReload",
			key: "ctrl+k ctrl+i",
			when: "workspaceFolderCount > 0"
		}, {
			command: "violetTheme.installReleaseAndReload",
			key: "ctrl+k ctrl+shift+i",
			when: "workspaceFolderCount > 0"
		}]);
		for (const file of [release.main, release.icon, "themes/decoration-styles.json", ...release.contributes.themes.map(theme => theme.path)]) {
			assert.deepStrictEqual(fs.readFileSync(path.join(destination, file)), fs.readFileSync(path.join(root, file)));
		}
		assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8"), original);
	} finally {
		fs.rmSync(destination, { recursive: true });
	}
});

test("extension icon is a 256 by 256 PNG", () => {
	const manifest = require("../package.json");
	const icon = fs.readFileSync(path.join(__dirname, "..", manifest.icon));
	assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
	assert.equal(icon.readUInt32BE(16), 256);
	assert.equal(icon.readUInt32BE(20), 256);
});

for (const development of [false, true]) test(`unused decorations and command registration in ${development ? "development" : "release"}`, () => {
	const listeners = {};
	const settings = {
		"workbench.colorTheme": "VS Code Violet Theme",
		"violetTheme.decorateUnusedCode": true,
		"editor.showUnused": true
	};
	const subscriptions = [];
	let disposed = 0;
	const subscribe = name => callback => {
		listeners[name] = callback;
		return { dispose: () => disposed++ };
	};
	const unusedRange = { start: 1, end: 4 };
	const diagnostics = [
		{ range: unusedRange, tags: [1] },
		{ range: { start: 5, end: 7 }, tags: [2] },
		{ range: { start: 8, end: 9 } }
	];
	const editor = {
		document: { uri: "file:example.js" },
		setDecorations(type, ranges) {
			assert.equal(type, decoration);
			this.ranges = Array.from(ranges);
		}
	};
	const decoration = { dispose: () => disposed++ };
	let options;
	let generatedStyles = { unusedFontStyle: "italic", unusedForeground: "#65737E" };
	let reloadStyles;
	let unwatched = false;
	const registeredCommands = [];
	const vscode = {
		commands: { registerCommand: command => {
			registeredCommands.push(command);
			return { dispose() {} };
		} },
		ThemeColor: class {
			constructor(id) { this.id = id; }
		},
		DiagnosticTag: { Unnecessary: 1 },
		window: {
			visibleTextEditors: [editor],
			createTextEditorDecorationType(value) {
				options = value;
				return decoration;
			},
			onDidChangeVisibleTextEditors: subscribe("visible"),
			onDidChangeActiveColorTheme: subscribe("theme")
		},
		languages: {
			getDiagnostics: () => diagnostics,
			onDidChangeDiagnostics: subscribe("diagnostics")
		},
		workspace: {
			getConfiguration: section => ({
				get: (key, fallback) => settings[`${section}.${key}`] ?? fallback,
				inspect: key => ({ globalValue: settings[`${section}.${key}`] })
			}),
			onDidChangeConfiguration: subscribe("configuration")
		}
	};
	const sandbox = {
		module: { exports: {} },
		__dirname: path.join(__dirname, ".."),
		require: name => {
			if (name === "node:path") return path;
			if (name === "node:fs") return {
				readFileSync: () => JSON.stringify(generatedStyles),
				watchFile: (file, options, callback) => { reloadStyles = callback; },
				unwatchFile: () => { unwatched = true; }
			};
			if (name === "./package.json") {
				const manifest = structuredClone(require("../package.json"));
				if (development) manifest.contributes.commands = [
					{ command: "violetTheme.installAndReload" },
					{ command: "violetTheme.installReleaseAndReload" }
				];
				return manifest;
			}
			if (name === "./themes/VS Code Violet Theme-color-theme.json") {
				return { colors: { "violetTheme.unusedForeground": "#65737E" } };
			}
			assert.equal(name, "vscode");
			return vscode;
		}
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "extension.cjs"), "utf8"), sandbox);
	sandbox.module.exports.activate({ subscriptions });
	assert.deepStrictEqual(registeredCommands, development
		? ["violetTheme.installAndReload", "violetTheme.installReleaseAndReload"] : []);
	assert.equal(options.fontStyle, "italic");
	assert.equal(options.color.id, "violetTheme.unusedForeground");
	assert.deepStrictEqual(editor.ranges, [unusedRange]);

	diagnostics.length = 0;
	listeners.diagnostics();
	assert.deepStrictEqual(editor.ranges, []);
	diagnostics.push({ range: unusedRange, tags: [1] });
	listeners.diagnostics();
	assert.deepStrictEqual(editor.ranges, [unusedRange]);

	for (const setting of ["violetTheme.decorateUnusedCode", "editor.showUnused"]) {
		settings[setting] = false;
		listeners.configuration({ affectsConfiguration: key => key === setting });
		assert.deepStrictEqual(editor.ranges, []);
		settings[setting] = true;
		listeners.configuration({ affectsConfiguration: key => key === setting });
		assert.deepStrictEqual(editor.ranges, [unusedRange]);
	}
	settings["workbench.colorTheme"] = "Default Dark Modern";
	listeners.theme();
	assert.deepStrictEqual(editor.ranges, []);
	settings["workbench.colorTheme"] = "VS Code Violet Theme";
	listeners.configuration({ affectsConfiguration: key => key === "workbench.colorTheme" });
	assert.deepStrictEqual(editor.ranges, [unusedRange]);

	const secondEditor = { ...editor, ranges: [], document: { uri: "file:second.js" } };
	vscode.window.visibleTextEditors.push(secondEditor);
	listeners.visible();
	assert.deepStrictEqual(secondEditor.ranges, [unusedRange]);
	settings["workbench.colorCustomizations"] = { "violetTheme.unusedForeground": "#00000080" };
	listeners.configuration({ affectsConfiguration: key => key === "workbench.colorCustomizations" });
	assert.equal(options.opacity, String(128 / 255));
	assert.equal(options.color, undefined);
	assert.equal(options.fontStyle, "italic");
	settings["workbench.colorCustomizations"]["[VS Code Violet Theme]"] = {
		"violetTheme.unusedForeground": "#ff000080"
	};
	listeners.configuration({ affectsConfiguration: key => key === "workbench.colorCustomizations" });
	assert.equal(options.color.id, "violetTheme.unusedForeground");
	assert.equal(options.opacity, undefined);
	for (const fontStyle of ["normal", "oblique", "italic"]) {
		settings["violetTheme.unusedFontStyle"] = fontStyle;
		listeners.configuration({ affectsConfiguration: key => key === "violetTheme.unusedFontStyle" });
		assert.equal(options.fontStyle, fontStyle);
		assert.equal(options.color.id, "violetTheme.unusedForeground");
	}
	for (const [color, opacity] of [["#00000000", "0"], ["#000000FF", "1"]]) {
		settings["workbench.colorCustomizations"]["[VS Code Violet Theme]"]["violetTheme.unusedForeground"] = color;
		listeners.configuration({ affectsConfiguration: key => key === "workbench.colorCustomizations" });
		assert.equal(options.opacity, opacity);
		assert.equal(options.color, undefined);
	}
	settings["violetTheme.unusedFontStyle"] = "normal";
	listeners.configuration({ affectsConfiguration: key => key === "violetTheme.unusedFontStyle" });
	assert.equal(options.fontStyle, "normal");
	assert.equal(options.opacity, "1");
	assert.equal(options.color, undefined);
	for (const [style, expectedStyle, weight, textDecoration] of [
		["bold italic underline strikethrough", "italic", "bold", "underline line-through"],
		["strikethrough bold oblique", "oblique", "bold", "line-through"],
		["italic underline line-through", "italic", "normal", "underline line-through"],
		["italic underline wavy", "italic", "normal", "underline wavy"],
		["italic underline wavy #FF00FF", "italic", "normal", "underline wavy #FF00FF"],
		["line-through #ff00ff80", "normal", "normal", "line-through #ff00ff80"],
		["underline dotted", "normal", "normal", "underline dotted"],
		["underline dashed", "normal", "normal", "underline dashed"],
		["bold underline double", "normal", "bold", "underline double"],
		["underline solid strikethrough", "normal", "normal", "underline line-through solid"],
		["underline", "normal", "normal", "underline"],
		["bold", "normal", "bold", "none"],
		["", "normal", "normal", "none"]
	]) {
		settings["violetTheme.unusedFontStyle"] = style;
		listeners.configuration({ affectsConfiguration: key => key === "violetTheme.unusedFontStyle" });
		assert.equal(options.fontStyle, expectedStyle);
		assert.equal(options.fontWeight, weight);
		assert.equal(options.textDecoration, textDecoration);
		assert.equal(options.opacity, "1");
	}
	delete settings["violetTheme.unusedFontStyle"];
	generatedStyles = { unusedFontStyle: "italic underline wavy #FF00FF", unusedForeground: "#00000080" };
	delete settings["workbench.colorCustomizations"];
	reloadStyles();
	assert.equal(options.fontStyle, "italic");
	assert.equal(options.textDecoration, "underline wavy #FF00FF");
	assert.equal(options.opacity, String(128 / 255));
	settings["violetTheme.unusedFontStyle"] = "bold";
	generatedStyles = { unusedFontStyle: "underline", unusedForeground: "#000000ff" };
	reloadStyles();
	assert.equal(options.fontWeight, "bold");
	assert.equal(options.textDecoration, "none");
	assert.equal(options.opacity, "1");
	const pattern = new RegExp(require("../package.json").contributes.configuration.properties["violetTheme.unusedFontStyle"].pattern);
	for (const invalid of ["boldish", "normal italic", "italic oblique", "oblique bold italic", "underline; color: red", "wavy", "italic wavy", "wavy underline", "underline wavy dotted", "underline wavy underline dashed"]) {
		assert.equal(pattern.test(invalid), false);
		settings["violetTheme.unusedFontStyle"] = invalid;
		assert.throws(() => listeners.configuration({ affectsConfiguration: key => key === "violetTheme.unusedFontStyle" }), /Invalid violetTheme.unusedFontStyle/);
	}
	for (const subscription of subscriptions) subscription.dispose();
	assert.equal(disposed, 28);
	assert.equal(unwatched, true);
});
