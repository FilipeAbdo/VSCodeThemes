const fs = require("node:fs");
const path = require("node:path");

module.exports = function buildDevelopment(root, destination) {
	const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	const command = "violetTheme.installAndReload";
	manifest.contributes.commands = [
		...(manifest.contributes.commands || []),
		{ command, title: "Violet Theme: Install Locally and Reload Window" },
		{ command: "violetTheme.installReleaseAndReload", title: "Violet Theme: Install Release Locally and Reload Window" }
	];
	manifest.contributes.keybindings = [
		...(manifest.contributes.keybindings || []),
		{ command, key: "ctrl+k ctrl+i", when: "workspaceFolderCount > 0" },
		{ command: "violetTheme.installReleaseAndReload", key: "ctrl+k ctrl+shift+i", when: "workspaceFolderCount > 0" }
	];
	const files = [
		manifest.main,
		manifest.icon,
		"images/icon.svg",
		"README.md",
		"images/palette.png",
		"themes/decoration-styles.json",
		...manifest.contributes.themes.map(theme => theme.path)
	];
	for (const file of files) {
		const source = path.resolve(root, file);
		const target = path.resolve(destination, file);
		if (!source.startsWith(`${path.resolve(root)}${path.sep}`)
			|| !target.startsWith(`${path.resolve(destination)}${path.sep}`)) {
			throw new Error(`Extension file must be inside the extension directory: ${file}`);
		}
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.copyFileSync(source, target);
	}
	fs.writeFileSync(path.join(destination, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
};
