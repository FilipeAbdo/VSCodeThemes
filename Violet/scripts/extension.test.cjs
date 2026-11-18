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

test("release impact picker selects the task, cancels safely, and reloads only on success", async () => {
	for (const [label, expectedTask] of [
		["Patch", "Install Violet release locally"],
		["Minor", "Install Violet minor release locally"],
		["Major", "Install Violet major release locally"],
		[undefined, undefined]
	]) {
		for (const exitCode of [0, 1]) {
			const checks = [];
			let endTask;
			let fetched = false;
			let executed = false;
			let reloaded = false;
			const task = { name: expectedTask || "Install Violet release locally", scope: { uri: { fsPath: "C:\\Violet" } } };
			const tasks = task.name === "Install Violet release locally" ? [task]
				: [{ name: "Install Violet release locally", scope: task.scope }, task];
			const vscode = {
				window: {
					async showQuickPick(items) {
						assert.equal(checks.length, 2);
						return items.find(item => item.label === label);
					}
				},
				tasks: {
					async fetchTasks() { fetched = true; return tasks; },
					onDidEndTaskProcess(callback) { endTask = callback; return { dispose() {} }; },
					async executeTask(selected) {
						assert.equal(selected.name, expectedTask);
						executed = true;
						endTask({ execution: { task: selected }, exitCode });
					}
				},
				commands: { async executeCommand() { reloaded = true; } }
			};
			const sandbox = {
				module: { exports: {} },
				require: name => name === "node:child_process" ? {
					execFile(command, args, options, callback) {
						assert.equal(command, "git");
						assert.equal(options.cwd, "C:\\Violet");
						checks.push(args);
						callback(null, "", "");
					}
				} : name === "vscode" ? vscode
					: name === "./package.json" ? require("../package.json") : require(name)
			};
			vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "extension.cjs"), "utf8"), sandbox);
			const result = sandbox.module.exports.installAndReload(true, true);
			if (label && exitCode !== 0) await assert.rejects(result, /Window not reloaded/);
			else await result;
			assert.equal(fetched, true);
			assert.equal(executed, Boolean(label));
			assert.equal(reloaded, Boolean(label) && exitCode === 0);
		}
	}
});

test("release preflight blocks the impact picker without waiting for notification dismissal and reports Git failures", { timeout: 3000 }, async () => {
	for (const condition of ["dirty", "git-error", "missing-scope"]) {
		const messages = [];
		const terminalOutput = [];
		let terminalShown = false;
		let terminalClosed = false;
		let terminalPty;
		const cwd = "C:\\Violet";
		const sandbox = {
			module: { exports: {} },
			require(name) {
				if (name === "./package.json") return require("../package.json");
				if (name === "node:child_process") return {
					execFile(command, args, options, callback) {
						assert.equal(options.cwd, cwd);
						if (condition === "git-error") callback(new Error("Cannot run Git"));
						else callback(null, args[0] === "status" ? " M Violet/package.json\n" : "", "");
					}
				};
				if (name === "vscode") return {
					EventEmitter: class {
						event = callback => { this.callback = callback; };
						fire(value) { this.callback(value); }
						dispose() { terminalClosed = true; }
					},
					tasks: {
						async fetchTasks() {
							return [{
								name: "Install Violet release locally",
								...(condition === "missing-scope" ? {} : { scope: { uri: { fsPath: cwd } } })
							}];
						},
						executeTask() { assert.fail("Blocked release must not run a task"); }
					},
					window: {
						createTerminal(options) {
							assert.equal(options.name, "Violet release status");
							terminalPty = options.pty;
							terminalPty.onDidWrite(value => terminalOutput.push(value));
							return {
								show(preserveFocus) {
									assert.equal(preserveFocus, true);
									terminalShown = true;
									terminalPty.open();
								}
							};
						},
						showQuickPick() { assert.fail("Preflight must happen before the picker"); },
						showErrorMessage(message) {
							messages.push(message);
							return new Promise(() => {});
						}
					},
					commands: { executeCommand() { assert.fail("Blocked release must not reload"); } }
				};
				return require(name);
			}
		};
		vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "extension.cjs"), "utf8"), sandbox);
		const result = sandbox.module.exports.installAndReload(true, true);
		if (condition === "dirty") {
			await result;
			assert.equal(messages.length, 1);
			assert.match(messages[0], /Release blocked:.*Commit or stash.*Stop build watchers first/);
			assert.equal(terminalShown, true);
			assert.deepStrictEqual(terminalOutput, [`\x1b[31m${messages[0]}\x1b[0m\r\n`]);
			terminalPty.close();
			assert.equal(terminalClosed, true);
		} else {
			await assert.rejects(result, condition === "git-error" ? /Cannot run Git/ : /workspace-folder/);
			assert.deepStrictEqual(messages, []);
			assert.equal(terminalShown, false);
		}
	}
});

test("local installer switches between development and release in the same directory", async () => {
	const root = path.join(__dirname, "..");
	const home = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "violet-install-"));
	const manifest = require("../package.json");
	const destination = path.join(home, ".vscode", "extensions", `${manifest.name}-local`);
	try {
		for (const option of [false, undefined, "--significant", "-i", "--major", "-m", false]) {
			const release = option !== false;
			const operations = [];
			const sandbox = {
				module: { exports: {} },
				__dirname,
				process: { argv: ["node", "install-local.cjs", ...(release ? ["--release", ...(option ? [option] : [])] : [])], exitCode: 0 },
				console: { log() {}, error() {} },
				require(name) {
					if (name === "node:os") return { homedir: () => home };
					if (name === "./dev-target.cjs") return { getDestination: () => destination };
					if (name === "./release.cjs") return (option, directory) => {
						assert.equal(option, sandbox.process.argv[3]);
						assert.equal(directory, root);
						operations.push("release");
					};
					if (name === "./build-theme.cjs") {
						operations.push("build");
						return Promise.resolve();
					}
					return require(name);
				}
			};
			vm.runInNewContext(fs.readFileSync(path.join(__dirname, "install-local.cjs"), "utf8"), sandbox);
			await sandbox.module.exports;
			assert.deepStrictEqual(operations, release ? ["release", "build"] : ["build"]);
			const installed = JSON.parse(fs.readFileSync(path.join(destination, "package.json"), "utf8"));
			assert.deepStrictEqual(installed.contributes.commands, manifest.contributes.commands);
			assert.deepStrictEqual(installed.contributes.keybindings, manifest.contributes.keybindings);
			for (const file of [manifest.main, manifest.icon, ...manifest.contributes.themes.map(theme => theme.path)]) {
				assert.deepStrictEqual(fs.readFileSync(path.join(destination, file)), fs.readFileSync(path.join(root, file)));
			}
		}
	} finally {
		fs.rmSync(home, { recursive: true });
	}
});

test("release install handles a blocked repository without throwing and still reports unexpected failures", async () => {
	for (const blocked of [true, false]) {
		const errors = [];
		const sandbox = {
			module: { exports: {} },
			__dirname,
			process: { argv: ["node", "install-local.cjs", "--release"], exitCode: 0 },
			console: { log() {}, error: error => errors.push(error) },
			require(name) {
				if (name === "./dev-target.cjs") return { getDestination: () => path.join(__dirname, "not-installed") };
				if (name === "node:fs") return { existsSync: () => false };
				if (name === "./release.cjs") return () => {
					if (blocked) return null;
					throw new Error("Unexpected Git failure");
				};
				if (name === "./build-theme.cjs") assert.fail("Blocked release must not build or copy");
				return require(name);
			}
		};
		vm.runInNewContext(fs.readFileSync(path.join(__dirname, "install-local.cjs"), "utf8"), sandbox);
		if (blocked) {
			await sandbox.module.exports;
			assert.deepStrictEqual(errors, []);
		} else {
			await assert.rejects(sandbox.module.exports, /Unexpected Git failure/);
			assert.equal(errors.length, 1);
		}
		assert.equal(sandbox.process.exitCode, 1);
	}
});

test("release install stops before building or copying if versioning fails or options are invalid", async () => {
	for (const flags of [
		["--release"], ["--release", "-i", "-m"], ["--release", "--unknown"], ["-i"]
	]) {
		const failure = new Error("Release requires a clean repository");
		let releases = 0;
		let exitCode = 0;
		const sandbox = {
			module: { exports: {} },
			__dirname,
			process: {
				argv: ["node", "install-local.cjs", ...flags],
				get exitCode() { return exitCode; },
				set exitCode(value) { exitCode = value; }
			},
			console: { log() {}, error() {} },
			require(name) {
				if (name === "./dev-target.cjs") return { getDestination: () => path.join(__dirname, "not-installed") };
				if (name === "node:fs") return {
					existsSync: () => false,
					copyFileSync() { assert.fail("Must not copy after release failure"); }
				};
				if (name === "./release.cjs") return () => { releases++; throw failure; };
				if (name === "./build-theme.cjs") assert.fail("Must not build after release failure");
				return require(name);
			}
		};
		vm.runInNewContext(fs.readFileSync(path.join(__dirname, "install-local.cjs"), "utf8"), sandbox);
		await assert.rejects(sandbox.module.exports, flags.length === 1 && flags[0] === "--release"
			? /clean repository/ : /Usage/);
		assert.equal(releases, flags.length === 1 && flags[0] === "--release" ? 1 : 0);
		assert.equal(exitCode, 1);
	}
});

test("built-in install target follows the active versioned VS Code folder", () => {
	const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "violet-vscode-"));
	const appRoot = path.join(root, "69047191fc", "resources", "app");
	const launcherDirectory = path.join(root, "bin");
	fs.mkdirSync(path.join(appRoot, "extensions"), { recursive: true });
	fs.mkdirSync(launcherDirectory, { recursive: true });
	fs.writeFileSync(
		path.join(launcherDirectory, "code.cmd"),
		'"%~dp0..\\Code.exe" "%~dp0..\\69047191fc\\resources\\app\\out\\cli.js" %*\n'
	);
	try {
		const { getBuiltinExtensionsDirectory } = require("./dev-target.cjs");
		assert.equal(getBuiltinExtensionsDirectory(root), path.join(appRoot, "extensions"));
	} finally {
		fs.rmSync(root, { recursive: true });
	}
});

test("development build preserves shared release shortcuts without duplicates", () => {
	const root = path.join(__dirname, "..");
	const destination = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "violet-development-"));
	const original = fs.readFileSync(path.join(root, "package.json"), "utf8");
	try {
		require("./build-development.cjs")(root, destination);
		const release = JSON.parse(original);
		const development = JSON.parse(fs.readFileSync(path.join(destination, "package.json"), "utf8"));
		assert.deepStrictEqual(development.contributes.commands, release.contributes.commands);
		assert.equal(release.contributes.commands.some(({ command }) => command === "violetTheme.chooseReleaseAndReload"), true);
		assert.equal(new Set(development.contributes.commands.map(item => item.command)).size, development.contributes.commands.length);
		assert.deepStrictEqual(development.contributes.keybindings, [{
			command: "violetTheme.installAndReload",
			key: "ctrl+k ctrl+i",
			when: "workspaceFolderCount > 0"
		}, {
			command: "violetTheme.installReleaseAndReload",
			key: "ctrl+k ctrl+shift+i",
			when: "workspaceFolderCount > 0"
		}, {
			command: "violetTheme.chooseReleaseAndReload",
			key: "ctrl+k ctrl+/",
			when: "workspaceFolderCount > 0"
		}]);
		for (const file of [release.main, release.icon, ...release.contributes.themes.map(theme => theme.path)]) {
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

test("README links to the hosted palette and local preview", () => {
	const root = path.join(__dirname, "..");
	const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
	assert.match(readme, /!\[Violet Theme color palette[^\]]*\]\(https:\/\/raw\.githubusercontent\.com\/FilipeAbdo\/VSCodeThemes\/main\/Violet\/images\/palette\.png\)/);
	assert.ok(readme.includes("Violet Theme: Preview Color Palette"));
	assert.equal(readme.includes("data:image/png;base64,"), false);
});

test("generated editor icon resolves the current theme colors", () => {
	const root = path.join(__dirname, "..");
	const { common, tokens } = require("../src/palette.cjs");
	const svg = fs.readFileSync(path.join(root, "images", "icon.svg"), "utf8");
	assert.equal(svg.includes("var(--"), false);
	for (const color of [common.background, tokens.keywordStorage, tokens.entityNameMethodJs]) {
		assert.ok(svg.includes(color), `Icon should include ${color}`);
	}
	assert.ok(svg.includes("violet.js"));
	assert.ok(svg.includes('id="contrast-diamond"'));
	assert.ok(svg.includes('id="backdrop-dimmer"'));
	assert.equal(svg.includes("FILES"), false);
	const snippet = svg.match(/<g id="code-snippet"[^>]*>([\s\S]*?)<\/g>/)[1];
	const lines = Array.from(snippet.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g), match =>
		match[1].replace(/<[^>]+>/g, "").replace(/&quot;/g, '"')
	);
	assert.deepStrictEqual(lines, [
		"// A little more violet", "", 'const var = "Violet"', "",
		"class VioletTheme{", "    function makeItViolet(a, b){",
		"        var = 10.2;", "    }", "};"
	]);
	assert.match(svg, /id="backdrop-dimmer"[^>]*opacity="\.35"/);
	const theme = require("../src/theme.cjs");
	for (const scope of ["comment", "storage.type", "variable", "keyword", "string", "constant.numeric", "entity.name.function", "punctuation"]) {
		const settings = {};
		for (const rule of theme.tokenColors) {
			if ((Array.isArray(rule.scope) ? rule.scope : [rule.scope]).includes(scope)) Object.assign(settings, rule.settings);
		}
		const styles = new Set((settings.fontStyle || "").split(" "));
		assert.ok(svg.includes(`data-scope="${scope}" fill="${settings.foreground}" font-style="${styles.has("italic") ? "italic" : "normal"}" font-weight="${styles.has("bold") ? "bold" : "normal"}"`), `Icon must match theme style for ${scope}`);
	}
});

test("icon renderer picks up theme changes on the next build", async () => {
	const theme = structuredClone(require("../src/theme.cjs"));
	theme.colors["editor.background"] = "#123456";
	theme.tokenColors.find(rule => rule.name === "Keyword, Storage").settings = {
		foreground: "#abcdef", fontStyle: "bold"
	};
	let svg;
	const sandbox = {
		module: { exports: {} },
		__dirname,
		require(name) {
			if (name === "../src/theme.cjs") return theme;
			if (name === "node:fs") return {
				readFileSync: fs.readFileSync,
				mkdirSync() {},
				writeFileSync(file, value) { svg = value; }
			};
			return require(name);
		}
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "render-icon.cjs"), "utf8"), sandbox);
	await sandbox.module.exports({
		async setViewportSize() {},
		async goto() {},
		async evaluate() {},
		async screenshot() {}
	});
	assert.ok(svg.includes('fill="#123456"'));
	assert.ok(svg.includes('data-scope="storage.type" fill="#abcdef" font-style="normal" font-weight="bold"'));
});

for (const development of [false, true]) test(`unused decorations and command registration in ${development ? "development" : "release"}`, async () => {
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
			if (type === attributeDecoration) {
				this.attributeRanges = Array.from(ranges);
				return;
			}
			assert.equal(type, decoration);
			this.ranges = Array.from(ranges);
		}
	};
	const decoration = { dispose: () => disposed++ };
	let attributeDisposed = false;
	const attributeDecoration = { dispose: () => { attributeDisposed = true; } };
	let options;
	let generatedStyles = { unusedFontStyle: "italic", unusedForeground: "#65737E", attributeAccessForeground: "#e3f8f8" };
	let attributeOptions;
	let reloadStyles;
	let unwatched = false;
	const registeredCommands = [];
	const commandHandlers = new Map();
	const opened = [];
	const vscode = {
		Uri: { joinPath: (base, ...parts) => [base, ...parts].join("/") },
		commands: { executeCommand: async (...args) => { opened.push(args); }, registerCommand: (command, handler) => {
			registeredCommands.push(command);
			commandHandlers.set(command, handler);
			return { dispose() {} };
		} },
		ThemeColor: class {
			constructor(id) { this.id = id; }
		},
		DiagnosticTag: { Unnecessary: 1 },
		window: {
			visibleTextEditors: [editor],
			createTextEditorDecorationType(value) {
				if (!Object.hasOwn(value, "fontStyle")) {
					attributeOptions = value;
					return attributeDecoration;
				}
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
			if (name === "node:child_process") return {
				execFile() { assert.fail("Activation must not check repository status"); }
			};
			if (name === "node:fs") return {
				readFileSync: file => {
					assert.equal(file, path.join(__dirname, "..", "themes", "VS Code Violet Theme-color-theme.json"));
					return JSON.stringify({ decorationStyles: generatedStyles });
				},
				watchFile: (file, options, callback) => {
					assert.equal(file, path.join(__dirname, "..", "themes", "VS Code Violet Theme-color-theme.json"));
					reloadStyles = callback;
				},
				unwatchFile: () => { unwatched = true; }
			};
			if (name === "./package.json") {
				return structuredClone(require("../package.json"));
			}
			if (name === "./themes/VS Code Violet Theme-color-theme.json") {
				return { colors: { "violetTheme.unusedForeground": "#65737E" } };
			}
			assert.equal(name, "vscode");
			return vscode;
		}
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "extension.cjs"), "utf8"), sandbox);
	sandbox.module.exports.activate({ subscriptions, extensionUri: "file:///installed-violet" });
	assert.deepStrictEqual(registeredCommands,
		["violetTheme.previewPalette", "violetTheme.installAndReload", "violetTheme.installReleaseAndReload", "violetTheme.chooseReleaseAndReload"]);
	await commandHandlers.get("violetTheme.previewPalette")();
	assert.deepStrictEqual(opened, [["vscode.open", "file:///installed-violet/images/palette.png"]]);
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
	generatedStyles = { unusedFontStyle: "italic underline wavy #FF00FF", unusedForeground: "#00000080", attributeAccessForeground: "#e3f8f8" };
	delete settings["workbench.colorCustomizations"];
	reloadStyles();
	assert.equal(options.fontStyle, "italic");
	assert.equal(options.textDecoration, "underline wavy #FF00FF");
	assert.equal(options.opacity, String(128 / 255));
	settings["violetTheme.unusedFontStyle"] = "bold";
	generatedStyles = { unusedFontStyle: "underline", unusedForeground: "#000000ff", attributeAccessForeground: "#e3f8f8" };
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
	delete settings["violetTheme.unusedFontStyle"];
	editor.document.languageId = "python";
	const attributeRange = { start: 32, end: 36 };
	const attributeDiagnostic = {
		range: attributeRange,
		source: "Pylance",
		code: { value: "reportAttributeAccessIssue", target: "https://example.com/diagnostic" }
	};
	diagnostics.splice(0, diagnostics.length,
		attributeDiagnostic,
		{ ...attributeDiagnostic, source: "Other" },
		{ ...attributeDiagnostic, code: "reportUnknownMemberType" }
	);
	listeners.diagnostics();
	assert.deepStrictEqual(editor.attributeRanges, [attributeRange]);
	assert.equal(attributeOptions.color, "#e3f8f8");
	generatedStyles.attributeAccessForeground = "#123456";
	reloadStyles();
	assert.equal(attributeOptions.color, "#123456");
	settings["workbench.colorCustomizations"] = { "violetTheme.attributeAccessForeground": "#abcdef" };
	listeners.configuration({ affectsConfiguration: key => key === "workbench.colorCustomizations" });
	assert.equal(attributeOptions.color, "#abcdef");
	settings["workbench.colorCustomizations"]["[VS Code Violet Theme]"] = {
		"violetTheme.attributeAccessForeground": "#fedcba"
	};
	listeners.configuration({ affectsConfiguration: key => key === "workbench.colorCustomizations" });
	assert.equal(attributeOptions.color, "#fedcba");
	assert.deepStrictEqual(secondEditor.attributeRanges, []);
	attributeDiagnostic.code = "reportAttributeAccessIssue";
	listeners.diagnostics();
	assert.deepStrictEqual(editor.attributeRanges, [attributeRange]);
	settings["violetTheme.decorateAttributeAccessIssues"] = false;
	listeners.configuration({ affectsConfiguration: key => key === "violetTheme.decorateAttributeAccessIssues" });
	assert.deepStrictEqual(editor.attributeRanges, []);
	settings["violetTheme.decorateAttributeAccessIssues"] = true;
	listeners.diagnostics();
	assert.deepStrictEqual(editor.attributeRanges, [attributeRange]);
	settings["workbench.colorTheme"] = "Default Dark Modern";
	listeners.theme();
	assert.deepStrictEqual(editor.attributeRanges, []);
	settings["workbench.colorTheme"] = "VS Code Violet Theme";
	listeners.theme();
	assert.deepStrictEqual(editor.attributeRanges, [attributeRange]);
	diagnostics.length = 0;
	listeners.diagnostics();
	assert.deepStrictEqual(editor.attributeRanges, []);
	for (const subscription of subscriptions) subscription.dispose();
	assert.equal(attributeDisposed, true);
	assert.equal(disposed, 29);
	assert.equal(unwatched, true);
});
