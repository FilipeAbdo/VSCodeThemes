const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("./package.json");

async function installAndReload(release = false) {
	const taskName = release ? "Install Violet release locally" : "Install Violet theme locally";
	const tasks = await vscode.tasks.fetchTasks({ type: "npm" });
	const matches = tasks.filter(task => task.name === taskName);
	if (matches.length !== 1) {
		throw new Error(`Open the Violet project with exactly one '${taskName}' task.`);
	}
	const task = matches[0];
	let listener;
	const finished = new Promise(resolve => {
		listener = vscode.tasks.onDidEndTaskProcess(event => {
			if (event.execution.task === task) resolve(event.exitCode);
		});
	});
	try {
		await vscode.tasks.executeTask(task);
		const exitCode = await finished;
		if (exitCode !== 0) {
			throw new Error(`Local installation failed or was cancelled (exit code: ${exitCode ?? "unknown"}). Window not reloaded.`);
		}
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	} finally {
		listener.dispose();
	}
}

function activate(context) {
	let installing = false;
	for (const [command, release] of [
		["violetTheme.installAndReload", false],
		["violetTheme.installReleaseAndReload", true]
	]) {
		if (!manifest.contributes.commands?.some(contribution => contribution.command === command)) continue;
		context.subscriptions.push(vscode.commands.registerCommand(command, async () => {
			if (installing) return;
			installing = true;
			try {
				await installAndReload(release);
			} catch (error) {
				console.error("Violet local installation failed:", error);
				await vscode.window.showErrorMessage(`Violet: ${error.message}`);
			} finally {
				installing = false;
			}
		}));
	}
	const stylesPath = path.join(__dirname, "themes", "decoration-styles.json");
	let generatedStyles = readStyles();
	let decoration;
	let previousColor;
	let previousFontStyle;

	function readStyles() {
		const styles = JSON.parse(fs.readFileSync(stylesPath, "utf8"));
		const setting = manifest.contributes.configuration.properties["violetTheme.unusedFontStyle"];
		if (typeof styles.unusedFontStyle !== "string"
			|| !new RegExp(setting.pattern).test(styles.unusedFontStyle)
			|| typeof styles.unusedForeground !== "string"
			|| !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(styles.unusedForeground)) {
			throw new Error("Invalid generated Violet decoration styles. Run npm run build.");
		}
		return styles;
	}

	function updateDecoration() {
		const overrides = vscode.workspace.getConfiguration("workbench").get("colorCustomizations", {});
		const color = overrides["[VS Code Violet Theme]"]?.["violetTheme.unusedForeground"]
			?? overrides["violetTheme.unusedForeground"]
			?? generatedStyles.unusedForeground;
		const configuredStyle = vscode.workspace.getConfiguration("violetTheme").inspect("unusedFontStyle");
		const fontStyle = configuredStyle?.workspaceFolderValue
			?? configuredStyle?.workspaceValue
			?? configuredStyle?.globalValue
			?? generatedStyles.unusedFontStyle;
		const setting = manifest.contributes.configuration.properties["violetTheme.unusedFontStyle"];
		if (typeof fontStyle !== "string" || !new RegExp(setting.pattern).test(fontStyle)) {
			throw new Error(`Invalid violetTheme.unusedFontStyle: ${fontStyle}`);
		}
		if (decoration && color === previousColor && fontStyle === previousFontStyle) return;
		decoration?.dispose();
		previousColor = color;
		previousFontStyle = fontStyle;
		const alphaOnly = typeof color === "string" && /^#000000[0-9a-f]{2}$/i.test(color);
		const styles = new Set(fontStyle.split(" "));
		decoration = vscode.window.createTextEditorDecorationType({
			...(alphaOnly
				? { opacity: String(parseInt(color.slice(7), 16) / 255) }
				: { color: new vscode.ThemeColor("violetTheme.unusedForeground") }),
			fontStyle: styles.has("italic") ? "italic" : styles.has("oblique") ? "oblique" : "normal",
			fontWeight: styles.has("bold") ? "bold" : "normal",
			textDecoration: [
				...(styles.has("underline") ? ["underline"] : []),
				...(styles.has("strikethrough") || styles.has("line-through") ? ["line-through"] : []),
				...["solid", "wavy", "dotted", "dashed", "double"].filter(style => styles.has(style)),
				...Array.from(styles).filter(style => style.startsWith("#"))
			].join(" ") || "none"
		});
	}

	function updateEditors() {
		updateDecoration();
		const isViolet = vscode.workspace.getConfiguration("workbench").get("colorTheme") === "VS Code Violet Theme";
		for (const editor of vscode.window.visibleTextEditors) {
			const enabled = isViolet
				&& vscode.workspace.getConfiguration("violetTheme", editor.document.uri).get("decorateUnusedCode", true)
				&& vscode.workspace.getConfiguration("editor", editor.document.uri).get("showUnused", true);
			const ranges = enabled
				? vscode.languages.getDiagnostics(editor.document.uri)
					.filter(diagnostic => diagnostic.tags?.includes(vscode.DiagnosticTag.Unnecessary))
					.map(diagnostic => diagnostic.range)
				: [];
			editor.setDecorations(decoration, ranges);
		}
	}

	fs.watchFile(stylesPath, { interval: 250, persistent: false }, reloadStyles);
	function reloadStyles() {
		try {
			generatedStyles = readStyles();
		} catch (error) {
			console.error("Could not reload Violet decoration styles:", error);
			void vscode.window.showErrorMessage(`Could not reload Violet decoration styles: ${error.message}`);
			return;
		}
		updateEditors();
	}

	context.subscriptions.push(
		{ dispose: () => fs.unwatchFile(stylesPath, reloadStyles) },
		{ dispose: () => decoration?.dispose() },
		vscode.languages.onDidChangeDiagnostics(updateEditors),
		vscode.window.onDidChangeVisibleTextEditors(updateEditors),
		vscode.window.onDidChangeActiveColorTheme(updateEditors),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (["workbench.colorTheme", "workbench.colorCustomizations", "violetTheme.decorateUnusedCode", "violetTheme.unusedFontStyle", "editor.showUnused"]
				.some(setting => event.affectsConfiguration(setting))) {
				updateEditors();
			}
		})
	);
	updateEditors();
}

module.exports = { activate, installAndReload };
