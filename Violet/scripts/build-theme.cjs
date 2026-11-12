const fs = require("node:fs");
const path = require("node:path");
console.log("Building VS Code Violet Theme...");
const { decorationStyles, configurationColorDefaults, ...theme } = require("../src/theme.cjs");
const renderPalette = require("./render-palette.cjs");
const manifestPath = path.join(__dirname, "..", "package.json");

const outputPath = path.join(__dirname, "..", "themes", "VS Code Violet Theme-color-theme.json");

module.exports = (async () => {
	for (const [key, color] of Object.entries(configurationColorDefaults)) {
		if (typeof color !== "string" || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color)) {
			throw new Error(`Invalid configuration color ${key}: ${color}`);
		}
	}
	await renderPalette();
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	const fontStyleSetting = manifest.contributes.configuration.properties["violetTheme.unusedFontStyle"];
	if (typeof decorationStyles.unusedFontStyle !== "string"
		|| !new RegExp(fontStyleSetting.pattern).test(decorationStyles.unusedFontStyle)) {
		throw new Error(`Invalid unused font style: ${decorationStyles.unusedFontStyle}`);
	}
	let manifestChanged = false;
	if (fontStyleSetting.default !== decorationStyles.unusedFontStyle) {
		fontStyleSetting.default = decorationStyles.unusedFontStyle;
		manifestChanged = true;
	}
	const defaults = manifest.contributes.configurationDefaults;
	const colorCustomizations = defaults["workbench.colorCustomizations"] || {};
	const themeKey = `[${theme.name}]`;
	const themeColors = colorCustomizations[themeKey] || {};
	for (const [key, color] of Object.entries(configurationColorDefaults)) {
		if (themeColors[key] !== color) {
			themeColors[key] = color;
			manifestChanged = true;
		}
	}
	if (manifestChanged) {
		colorCustomizations[themeKey] = themeColors;
		defaults["workbench.colorCustomizations"] = colorCustomizations;
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	}
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, `${JSON.stringify(theme, null, "\t")}\n`);
	fs.writeFileSync(path.join(__dirname, "..", "themes", "decoration-styles.json"), `${JSON.stringify({
		unusedFontStyle: decorationStyles.unusedFontStyle,
		unusedForeground: theme.colors["violetTheme.unusedForeground"]
	}, null, 2)}\n`);
	if (process.argv.includes("--development")) {
		require("./build-development.cjs")(
			path.join(__dirname, ".."),
			path.join(__dirname, "..", ".vscode", "development")
		);
	}
	console.log("Built VS Code Violet Theme.");
})();

module.exports.catch(error => {
	console.error(error);
	process.exitCode = 1;
});
