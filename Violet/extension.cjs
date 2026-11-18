const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("./package.json");

async function installAndReload(release = false, chooseImpact = false) {
	let taskName = release ? "Install Violet release locally" : "Install Violet theme locally";
	if (chooseImpact) {
		const impact = await vscode.window.showQuickPick([
			{ label: "Patch", description: "Increment patch: 1.2.3 -> 1.2.4", taskName: "Install Violet release locally" },
			{ label: "Minor", description: "Increment minor: 1.2.3 -> 1.3.0", taskName: "Install Violet minor release locally" },
			{ label: "Major", description: "Increment major: 1.2.3 -> 2.0.0", taskName: "Install Violet major release locally" }
		], { title: "Violet release impact", placeHolder: "Choose version impact (commits, tags, installs, and reloads)" });
		if (!impact) return;
		taskName = impact.taskName;
	}
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
	context.subscriptions.push(vscode.commands.registerCommand("violetTheme.previewPalette", () =>
		vscode.commands.executeCommand("vscode.open", vscode.Uri.joinPath(context.extensionUri, "images", "palette.png"))
	));
	let installing = false;
	for (const [command, release, chooseImpact] of [
		["violetTheme.installAndReload", false],
		["violetTheme.installReleaseAndReload", true],
		["violetTheme.chooseReleaseAndReload", true, true]
	]) {
		if (!manifest.contributes.commands?.some(contribution => contribution.command === command)) continue;
		context.subscriptions.push(vscode.commands.registerCommand(command, async () => {
			if (installing) return;
			installing = true;
			try {
				await installAndReload(release, chooseImpact);
			} catch (error) {
				console.error("Violet local installation failed:", error);
				await vscode.window.showErrorMessage(`Violet: ${error.message}`);
			} finally {
				installing = false;
			}
		}));
	}
	const stylesPath = path.join(__dirname, manifest.contributes.themes[0].path);
	let generatedStyles = readStyles();
	let decoration;
	let attributeAccessDecoration;
	let previousAttributeAccessColor;
	let previousColor;
	let previousFontStyle;

	function readStyles() {
		const styles = JSON.parse(fs.readFileSync(stylesPath, "utf8")).decorationStyles;
		const setting = manifest.contributes.configuration.properties["violetTheme.unusedFontStyle"];
		if (!styles || typeof styles.unusedFontStyle !== "string"
			|| !new RegExp(setting.pattern).test(styles.unusedFontStyle)
			|| typeof styles.unusedForeground !== "string"
			|| !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(styles.unusedForeground)
			|| typeof styles.attributeAccessForeground !== "string"
			|| !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(styles.attributeAccessForeground)) {
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
		const overrides = vscode.workspace.getConfiguration("workbench").get("colorCustomizations", {});
		const attributeAccessColor = overrides["[VS Code Violet Theme]"]?.["violetTheme.attributeAccessForeground"]
			?? overrides["violetTheme.attributeAccessForeground"]
			?? generatedStyles.attributeAccessForeground;
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
			const attributeAccessRanges = isViolet
				&& editor.document.languageId === "python"
				&& vscode.workspace.getConfiguration("violetTheme", editor.document.uri).get("decorateAttributeAccessIssues", true)
				? vscode.languages.getDiagnostics(editor.document.uri)
					.filter(diagnostic => diagnostic.source === "Pylance"
						&& (typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code) === "reportAttributeAccessIssue")
					.map(diagnostic => diagnostic.range)
				: [];
			if (attributeAccessRanges.length && (!attributeAccessDecoration || attributeAccessColor !== previousAttributeAccessColor)) {
				attributeAccessDecoration?.dispose();
				attributeAccessDecoration = vscode.window.createTextEditorDecorationType({
					color: attributeAccessColor
				});
				previousAttributeAccessColor = attributeAccessColor;
			}
			if (attributeAccessDecoration) editor.setDecorations(attributeAccessDecoration, attributeAccessRanges);
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
		{ dispose: () => attributeAccessDecoration?.dispose() },
		vscode.languages.onDidChangeDiagnostics(updateEditors),
		vscode.window.onDidChangeVisibleTextEditors(updateEditors),
		vscode.window.onDidChangeActiveColorTheme(updateEditors),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (["workbench.colorTheme", "workbench.colorCustomizations", "violetTheme.decorateUnusedCode", "violetTheme.decorateAttributeAccessIssues", "violetTheme.unusedFontStyle", "editor.showUnused"]
				.some(setting => event.affectsConfiguration(setting))) {
				updateEditors();
			}
		})
	);
	updateEditors();
}

module.exports = { activate, installAndReload };
